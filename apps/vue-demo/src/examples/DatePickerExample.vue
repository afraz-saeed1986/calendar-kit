<script setup lang="ts">
import type { SelectionValue } from '@calendrix/core';
import { DatePicker } from '@calendrix/vue';
import { ref } from 'vue';

const date = ref<SelectionValue<'single'>>();
</script>

<template>
  <DatePicker v-model="date" />
  <pre>{{ date }}</pre>
</template>
