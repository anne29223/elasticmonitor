# Self-Hosted Elasticsearch Server Setup

## Quick Setup with Docker

### 1. Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    environment:
      - node.name=elasticsearch
      - cluster.name=elasticmonitor-cluster
      - discovery.type=single-node
      - bootstrap.memory_lock=true
      - "ES_JAVA_OPTS=-Xms2g -Xmx2g"
      - xpack.security.enabled=true
      - xpack.security.authc.api_key.enabled=true
      - ELASTIC_PASSWORD=your_strong_password_here
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
      - ./elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml
    ports:
      - "9200:9200"
      - "9300:9300"
    networks:
      - elastic

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
      - ELASTICSEARCH_USERNAME=elastic
      - ELASTICSEARCH_PASSWORD=your_strong_password_here
    ports:
      - "5601:5601"
    networks:
      - elastic
    depends_on:
      - elasticsearch

volumes:
  elasticsearch-data:
    driver: local

networks:
  elastic:
    driver: bridge
```

### 2. Elasticsearch Configuration
```yaml
# elasticsearch.yml
cluster.name: elasticmonitor-cluster
node.name: elasticsearch-node-1
path.data: /usr/share/elasticsearch/data
path.logs: /usr/share/elasticsearch/logs
network.host: 0.0.0.0
http.port: 9200

# Security settings
xpack.security.enabled: true
xpack.security.authc.api_key.enabled: true
xpack.security.transport.ssl.enabled: false
xpack.security.http.ssl.enabled: false

# Performance settings
indices.query.bool.max_clause_count: 10000
search.max_buckets: 65536
```

### 3. Start the Server
```bash
# Create the configuration file
mkdir elasticsearch-config
# Copy elasticsearch.yml to ./elasticsearch.yml

# Start Elasticsearch and Kibana
docker-compose up -d

# Check if running
docker-compose ps

# View logs
docker-compose logs elasticsearch
```

## Manual Installation (Linux/Ubuntu)

### 1. Install Java
```bash
sudo apt update
sudo apt install openjdk-11-jdk
java -version
```

### 2. Install Elasticsearch
```bash
# Download and install
wget https://artifacts.elastic.co/downloads/elasticsearch/elasticsearch-8.11.0-linux-x86_64.tar.gz
tar -xzf elasticsearch-8.11.0-linux-x86_64.tar.gz
cd elasticsearch-8.11.0

# Configure
cp config/elasticsearch.yml config/elasticsearch.yml.backup
```

### 3. Configuration
```yaml
# config/elasticsearch.yml
cluster.name: elasticmonitor-cluster
node.name: node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: 0.0.0.0
http.port: 9200
discovery.type: single-node

# Security
xpack.security.enabled: true
xpack.security.authc.api_key.enabled: true
```

### 4. Start Elasticsearch
```bash
# Start in background
./bin/elasticsearch -d

# Check status
curl -X GET "localhost:9200/?pretty"
```

## Security Setup

### 1. Set Password for Built-in Users
```bash
# Using Docker
docker exec -it elasticsearch /usr/share/elasticsearch/bin/elasticsearch-setup-passwords interactive

# Manual installation
./bin/elasticsearch-setup-passwords interactive
```

### 2. Create API Key for ElasticMonitor
```bash
# Create API key
curl -X POST "localhost:9200/_security/api_key" \
  -u elastic:your_password \
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
  }'
```

### 3. Response will contain your API key
```json
{
  "id": "VuaCfGcBCdbkQm-e5aOx",
  "name": "elasticmonitor-api-key",
  "expiration": 1735689600000,
  "api_key": "ui2lp2axTNmsyakw9tvNnw",
  "encoded": "VnVhQ2ZHY0JDZGJrUW0tZTVhT3g6dWkybHAyYXhUTm1zeWFrdzl0dk5udw=="
}
```

## Index Setup

### 1. Create Index Template
```bash
curl -X PUT "localhost:9200/_index_template/logs-network-template" \
  -u elastic:your_password \
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
          "@timestamp": {
            "type": "date"
          },
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
```

## Performance Tuning

### 1. Memory Settings
```bash
# Set JVM heap size (half of available RAM)
export ES_JAVA_OPTS="-Xms4g -Xmx4g"

# For Docker, add to docker-compose.yml:
# ES_JAVA_OPTS: "-Xms4g -Xmx4g"
```

### 2. System Settings
```bash
# Increase file descriptors
echo "elasticsearch soft nofile 65536" >> /etc/security/limits.conf
echo "elasticsearch hard nofile 65536" >> /etc/security/limits.conf

# Disable swap
sudo swapoff -a
echo 'vm.swappiness=1' >> /etc/sysctl.conf

# Increase virtual memory
echo 'vm.max_map_count=262144' >> /etc/sysctl.conf
sudo sysctl -p
```

## Monitoring & Maintenance

### 1. Health Check
```bash
# Cluster health
curl -X GET "localhost:9200/_cluster/health?pretty" -u elastic:password

# Node stats
curl -X GET "localhost:9200/_nodes/stats?pretty" -u elastic:password
```

### 2. Index Management
```bash
# List indices
curl -X GET "localhost:9200/_cat/indices?v" -u elastic:password

# Delete old indices (automated cleanup)
curl -X DELETE "localhost:9200/logs-network-2024.01.01" -u elastic:password
```

### 3. Backup
```bash
# Create snapshot repository
curl -X PUT "localhost:9200/_snapshot/my_backup" \
  -u elastic:password \
  -H "Content-Type: application/json" \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/usr/share/elasticsearch/backup"
    }
  }'

# Create snapshot
curl -X PUT "localhost:9200/_snapshot/my_backup/snapshot_1" \
  -u elastic:password
```

## Firewall & Security

### 1. UFW Firewall Rules
```bash
# Allow Elasticsearch port
sudo ufw allow 9200/tcp

# Allow Kibana port (optional)
sudo ufw allow 5601/tcp

# Allow only specific IPs
sudo ufw allow from YOUR_APP_SERVER_IP to any port 9200
```

### 2. Nginx Reverse Proxy (Optional)
```nginx
# /etc/nginx/sites-available/elasticsearch
server {
    listen 80;
    server_name your-elasticsearch-domain.com;
    
    location / {
        proxy_pass http://localhost:9200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Basic auth (additional security)
        auth_basic "Elasticsearch";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
```

Your self-hosted Elasticsearch server will be much faster and give you full control! 🚀