#!/bin/sh
ROOT_DIR=/usr/share/nginx/html/assets
# Replace env vars in files served by NGINX
for file in $ROOT_DIR/*.js*;
do
  sed -i 's|PLACEHOLDER_VITE_API_SERVER_URL|'${API_SERVER_URL}'|g' $file
  sed -i 's|PLACEHOLDER_VITE_API_SERVER_VERSION|'${API_SERVER_VERSION}'|g' $file
  # Your other variables here...
done

# Let container execution proceed
exec "$@"
