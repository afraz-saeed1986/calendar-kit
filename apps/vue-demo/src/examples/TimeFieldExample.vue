<script setup lang="ts">
import type { TimeValue } from '@calendrix/core';
import { TimeField } from '@calendrix/vue';
import { ref } from 'vue';

const time = ref<TimeValue | null>();
</script>

<template>
  <TimeField v-model="time" />
  <pre v-if="time">{{ time }}</pre>
</template>
