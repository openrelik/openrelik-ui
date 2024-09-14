<!--
Copyright 2024 Google LLC

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
  <v-form v-model="valid" @submit.prevent>
    <template v-for="field in fields" :key="field.name">
      <component
        v-model="formData[field.name]"
        variant="outlined"
        :is="getFieldComponent(field.type)"
        :label="field.label"
        :hint="field.description"
        :required="field.required"
        :rules="field.required ? [(v) => !!v || 'This field is required'] : []"
      />
    </template>
    <v-btn
      variant="text"
      color="info"
      class="text-none"
      @click="$emit('save', formData)"
      >Save</v-btn
    >
    <v-btn variant="text" class="text-none" @click="$emit('cancel')"
      >Cancel</v-btn
    >
  </v-form>
</template>

<script>
import { VTextField } from "vuetify/components/VTextField";
import { VTextarea } from "vuetify/components/VTextarea";
import { VCheckbox } from "vuetify/components/VCheckbox";
import { VRadio } from "vuetify/components/VRadio";
import { VSwitch } from "vuetify/components/VSwitch";
import { VSelect } from "vuetify/components/VSelect";

export default {
  props: {
    fields: {
      type: Array,
      required: true,
    },
  },
  components: {
    VTextField,
    VTextarea,
    VCheckbox,
    VRadio,
    VSwitch,
    VSelect,
  },
  data() {
    return {
      valid: false,
      // Initial form data, set to empty strings or false for checkboxes
      formData: this.fields.reduce((initialFormData, field) => {
        initialFormData[field.name] = field.value ? field.value : null;
        return initialFormData;
      }, {}),
    };
  },
  methods: {
    getFieldComponent(type) {
      // Map field types to Vuetify components
      const mapping = {
        text: "v-text-field",
        textarea: "v-textarea",
        checkbox: "v-checkbox",
        radio: "v-radio",
        switch: "v-switch",
        select: "v-select",
      };
      return mapping[type] || "v-text-field"; // Default to text field
    },
  },
};
</script>

<style scoped></style>
