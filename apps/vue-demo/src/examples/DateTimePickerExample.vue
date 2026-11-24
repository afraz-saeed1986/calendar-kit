<script setup lang="ts">
import type { DateTimeValue } from '@calendrix/core';
import { DateTimePicker } from '@calendrix/vue';
import { ref } from 'vue';

const value = ref<DateTimeValue | null>();
</script>

<template>
  <DateTimePicker v-model="value" />
  <pre>{{ value }}</pre>
</template>
