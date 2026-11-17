<script setup lang="ts">
import type { DateTimeValue, SelectionValue, TimeValue } from '@calendrix/core';
import { persianPlugin } from '@calendrix/persian';
import { Calendar, DatePicker, DateTimePicker, TimeField } from '@calendrix/vue';
import { ref } from 'vue';

const plugins = [persianPlugin];

const day = ref<SelectionValue<'single'>>();
const range = ref<SelectionValue<'range'>>();
const time = ref<TimeValue | null>();
const pickedDay = ref<SelectionValue<'single'>>();
const pickedRange = ref<SelectionValue<'range'>>();
const pickedDays = ref<SelectionValue<'multiple'>>();
const dateTime = ref<DateTimeValue | null>();
const persianDateTime = ref<DateTimeValue | null>();
</script>

<template>
  <main>
    <h1>calendrix for Vue</h1>

    <section>
      <h2>Calendar, one day (en-US)</h2>
      <Calendar v-model="day" />
      <pre>{{ day }}</pre>
    </section>

    <section>
      <h2>Calendar, range with two months (Persian)</h2>
      <Calendar
        v-model="range"
        selection="range"
        system="persian"
        locale="fa-IR"
        direction="rtl"
        :visible-months="2"
        :plugins="plugins"
      />
      <pre>{{ range }}</pre>
    </section>

    <section>
      <h2>TimeField</h2>
      <TimeField v-model="time" />
      <pre>{{ time }}</pre>
    </section>

    <section>
      <h2>DatePicker</h2>
      <div class="row">
        <div>
          <DatePicker v-model="pickedDay" />
          <pre>{{ pickedDay }}</pre>
        </div>
        <div>
          <DatePicker v-model="pickedRange" selection="range" />
          <pre>{{ pickedRange }}</pre>
        </div>
        <div>
          <DatePicker v-model="pickedDays" selection="multiple" />
          <pre>{{ pickedDays }}</pre>
        </div>
      </div>
    </section>

    <section>
      <h2>DateTimePicker</h2>
      <div class="row">
        <div>
          <DateTimePicker v-model="dateTime" />
          <pre>{{ dateTime }}</pre>
        </div>
        <div dir="rtl">
          <DateTimePicker
            v-model="persianDateTime"
            system="persian"
            locale="fa-IR"
            direction="rtl"
            :plugins="plugins"
          />
          <pre dir="ltr">{{ persianDateTime }}</pre>
        </div>
      </div>
    </section>
  </main>
</template>