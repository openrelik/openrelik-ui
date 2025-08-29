<!--
Copyright 2025 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->
<template>
  <v-row style="overflow: auto; height: 100%" no-gutters>
    <v-col
      cols="3"
      style="border-right: 1px solid #e0e0e0; height: 100%; overflow-y: auto"
    >
      <v-list class="pa-0">
        <v-list-item
          v-for="(value, key, index) in schemas"
          :key="index"
          :title="key"
          :value="value"
          :active="selectedItem === key"
          prepend-icon="mdi-table"
          variant="flat"
          @click="selectedItem = key"
        ></v-list-item>
      </v-list>
    </v-col>
    <v-col cols="9" style="height: 100%; overflow-y: auto">
      <v-table>
        <thead>
          <tr>
            <th>Column</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(dataType, columnName) in schemas[selectedItem]"
            :key="columnName"
          >
            <td>{{ columnName }}</td>
            <td>{{ dataType }}</td>
          </tr>
        </tbody>
      </v-table>
    </v-col>
  </v-row>
</template>

<script>
export default {
  props: {
    schemas: Object,
  },
  data() {
    return {
      selectedItem: Object.keys(this.schemas)[0],
    };
  },
};
</script>
