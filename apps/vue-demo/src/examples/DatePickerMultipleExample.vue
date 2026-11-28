<script setup lang="ts">
import type { SelectionValue } from '@calendrix/core';
import { DatePicker } from '@calendrix/vue';
import { ref } from 'vue';

const dates = ref<SelectionValue<'multiple'>>();
</script>

<template>
  <DatePicker v-model="dates" selection="multiple" />
  <pre v-if="dates?.length">{{ dates }}</pre>
</template>
