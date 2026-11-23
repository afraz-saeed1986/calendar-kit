<script setup lang="ts">
import type { SelectionValue } from '@calendrix/core';
import { DatePicker } from '@calendrix/vue';
import { ref } from 'vue';

const range = ref<SelectionValue<'range'>>();
</script>

<template>
  <DatePicker v-model="range" selection="range" />
  <pre>{{ range }}</pre>
</template>