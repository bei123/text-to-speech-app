<template>
  <div class="snackbar">
    {{ message }}
  </div>
</template>

<script setup>
/* eslint-disable no-undef */
defineProps({
  message: {
    type: String,
    required: true
  }
});
/* eslint-enable no-undef */
</script>

<style scoped>
.snackbar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #333;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  z-index: 1000;
}
</style>