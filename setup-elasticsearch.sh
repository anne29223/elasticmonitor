#!/bin/bash

echo "🚀 Setting up Self-Hosted Elasticsearch for ElasticMonitor"
echo "=================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Set system requirements
echo "📋 Setting system requirements..."
sudo sysctl -w vm.max_map_count=262144
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf

# Start Elasticsearch and Kibana
echo "🔧 Starting Elasticsearch and Kibana..."
docker-compose up -d

# Wait for Elasticsearch to start
echo "⏳ Waiting for Elasticsearch to start..."
sleep 30

# Check if Elasticsearch is running
if curl -s http://localhost:9200 > /dev/null; then
    echo "✅ Elasticsearch is running!"
else
    echo "❌ Elasticsearch failed to start. Check logs with: docker-compose logs elasticsearch"
    exit 1
fi

# Set up passwords for built-in users
echo "🔐 Setting up security..."
docker exec -it elasticmonitor-elasticsearch /usr/share/elasticsearch/bin/elasticsearch-setup-passwords auto > passwords.txt

echo "📝 Passwords saved to passwords.txt"

# Create API key for ElasticMonitor
echo "🔑 Creating API key for ElasticMonitor..."
API_KEY_RESPONSE=$(curl -s -X POST "localhost:9200/_security/api_key" \
  -u "elastic:elasticmonitor_secure_password_2025" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "elasticmonitor-api-key",
    "role_descriptors": {
      "elasticmonitor_role": {
        "cluster": ["monitor", "manage_index_templates"],
        "indices": [
          {
            "names": ["logs-*", "network-*", "elasticmonitor-*"],
            "privileges": ["create", "create_index", "index", "read", "write", "delete", "manage"]
          }
        ]
      }
    },
    "expiration": "365d"
  }')

echo "API Key Response: $API_KEY_RESPONSE" > api_key.txt

# Create index template
echo "📊 Creating index template..."
curl -X PUT "localhost:9200/_index_template/logs-network-template" \
  -u "elastic:elasticmonitor_secure_password_2025" \
  -H "Content-Type: application/json" \
  -d '{
    "index_patterns": ["logs-network*"],
    "template": {
      "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
        "refresh_interval": "30s"
      },
      "mappings": {
        "properties": {
          "@timestamp": { "type": "date" },
          "source": {
            "properties": {
              "ip": { "type": "ip" },
              "port": { "type": "integer" }
            }
          },
          "destination": {
            "properties": {
              "ip": { "type": "ip" },
              "port": { "type": "integer" },
              "host": { "type": "keyword" }
            }
          },
          "network": {
            "properties": {
              "protocol": { "type": "keyword" },
              "bytes": { "type": "long" }
            }
          },
          "event": {
            "properties": {
              "action": { "type": "keyword" },
              "category": { "type": "keyword" }
            }
          },
          "message": { "type": "text" },
          "level": { "type": "keyword" },
          "rule_name": { "type": "keyword" },
          "tags": { "type": "keyword" }
        }
      }
    },
    "priority": 500,
    "version": 1
  }'

echo ""
echo "🎉 Setup Complete!"
echo "================================"
echo "Elasticsearch: http://localhost:9200"
echo "Kibana: http://localhost:5601"
echo "Username: elastic"
echo "Password: elasticmonitor_secure_password_2025"
echo ""
echo "📄 Next steps:"
echo "1. Check api_key.txt for your API key"
echo "2. Update your ElasticMonitor .env file:"
echo "   ELASTICSEARCH_URL=http://localhost:9200"
echo "   ELASTICSEARCH_USERNAME=elastic"
echo "   ELASTICSEARCH_PASSWORD=elasticmonitor_secure_password_2025"
echo "3. Restart ElasticMonitor to connect to your server"
echo ""
echo "📊 Monitor your cluster:"
echo "   docker-compose logs -f elasticsearch"
echo "   curl -u elastic:elasticmonitor_secure_password_2025 http://localhost:9200/_cluster/health"