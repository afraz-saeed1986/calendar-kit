<script setup lang="ts">
import type { DateTimeRange } from '@calendrix/core';
import { DateTimePicker } from '@calendrix/vue';
import { ref } from 'vue';

const range = ref<DateTimeRange | null>();
</script>

<template>
  <DateTimePicker v-model="range" selection="range" />
  <pre v-if="range">{{ range }}</pre>
</template>
