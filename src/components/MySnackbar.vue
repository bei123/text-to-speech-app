<template>
  <div :class="['snackbar', type]">
    {{ message }}
  </div>
</template>

<script setup>
/* eslint-disable no-undef */
defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'success'
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
  padding: 15px 30px;
  border-radius: 8px;
  color: #fff;
  z-index: 1000;
  animation: fadeInOut 3s ease-in-out;
}

.snackbar.success {
  background-color: #4caf50;
}

.snackbar.error {
  background-color: #f44336;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }

  10% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  90% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
}
</style>