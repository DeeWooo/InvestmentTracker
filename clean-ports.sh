#!/bin/bash
ports=( 3000 3001 3002) # 需要监控的端口列表

for port in "${ports[@]}"; do
  echo "Cleaning port $port..."
  lsof -ti :$port | xargs -I {} kill -9 {}
  sudo pfctl -t "port$port" -T flush 2>/dev/null
done

echo "Ports cleaned." 