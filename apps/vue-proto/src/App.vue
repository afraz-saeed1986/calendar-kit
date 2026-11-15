<script setup lang="ts">
import type { SelectionValue } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';
import { ref } from 'vue';
import Calendar from './Calendar.vue';

const plugins = [persianPlugin];
const single = ref<SelectionValue<'single'>>();
const range = ref<SelectionValue<'range'>>();
</script>

<template>
  <main>
    <h1>calendrix Vue prototype</h1>

    <h2>Single (en-US)</h2>
    <Calendar v-model="single" />
    <pre>{{ single }}</pre>

    <h2>Range (Persian)</h2>
    <Calendar
      v-model="range"
      selection="range"
      system="persian"
      locale="fa-IR"
      direction="rtl"
      :plugins="plugins"
    />
    <pre>{{ range }}</pre>
  </main>
</template>