<script setup lang="ts">
import type { SelectionValue } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';
import { DatePicker } from '@calendrix/vue';
import { ref } from 'vue';

const plugins = [persianPlugin];
const date = ref<SelectionValue<'single'>>();
</script>

<template>
  <DatePicker v-model="date" system="persian" locale="fa-IR" direction="rtl" :plugins="plugins" />
  <pre>{{ date }}</pre>
</template>