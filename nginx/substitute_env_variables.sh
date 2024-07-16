#!/bin/sh

# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

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
