/* eslint-disable no-undef */
<template>
  <div class="audio-waveform">
    <div class="waveform-container">
      <canvas ref="waveformCanvas" class="waveform-canvas"></canvas>
      <div class="controls">
        <button class="play-button" @click="togglePlay">
          <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
        </button>
        <div class="time-display">
          {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
        </div>
        <div class="volume-control">
          <i class="fas fa-volume-up"></i>
          <input 
            type="range" 
            v-model="volume" 
            min="0" 
            max="1" 
            step="0.1"
            @input="updateVolume"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, watch } from 'vue';

export default {
  name: 'AudioWaveform',
  props: {
    audioUrl: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const waveformCanvas = ref(null);
    const audioContext = ref(null);
    const analyser = ref(null);
    const dataArray = ref(null);
    const animationFrame = ref(null);
    const isPlaying = ref(false);
    const currentTime = ref(0);
    const duration = ref(0);
    const volume = ref(1);
    const audio = ref(null);

    const initAudio = () => {
      if (!audio.value) {
        audio.value = new Audio(props.audioUrl);
        audio.value.crossOrigin = 'anonymous';
      }
      
      if (!audioContext.value) {
        audioContext.value = new (window.AudioContext || window.webkitAudioContext)();
        analyser.value = audioContext.value.createAnalyser();
        const source = audioContext.value.createMediaElementSource(audio.value);
        source.connect(analyser.value);
        analyser.value.connect(audioContext.value.destination);
        
        analyser.value.fftSize = 256;
        const bufferLength = analyser.value.frequencyBinCount;
        dataArray.value = new Uint8Array(bufferLength);
      }
      
      // 初始化 Canvas 尺寸
      if (waveformCanvas.value) {
        const canvas = waveformCanvas.value;
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
      }
      
      audio.value.addEventListener('timeupdate', () => {
        currentTime.value = audio.value.currentTime;
      });
      
      audio.value.addEventListener('loadedmetadata', () => {
        duration.value = audio.value.duration;
      });
      
      audio.value.addEventListener('ended', () => {
        isPlaying.value = false;
      });

      audio.value.addEventListener('error', (e) => {
        console.error('音频加载错误:', e);
        isPlaying.value = false;
      });
    };

    const drawWaveform = () => {
      if (!waveformCanvas.value || !analyser.value || !dataArray.value) return;
      
      const canvas = waveformCanvas.value;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      analyser.value.getByteTimeDomainData(dataArray.value);
      
      // 清除画布
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, width, height);
      
      // 设置线条样式
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#42b983';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // 绘制波形
      ctx.beginPath();
      const sliceWidth = width / dataArray.value.length;
      let x = 0;
      
      for (let i = 0; i < dataArray.value.length; i++) {
        const v = dataArray.value[i] / 128.0;
        const y = v * height / 2;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        x += sliceWidth;
      }
      
      // 添加渐变效果
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#42b983');
      gradient.addColorStop(1, '#3aa876');
      ctx.strokeStyle = gradient;
      
      ctx.stroke();
      
      if (isPlaying.value) {
        animationFrame.value = requestAnimationFrame(drawWaveform);
      }
    };

    const togglePlay = async () => {
      if (!audio.value) {
        initAudio();
      }
      
      if (isPlaying.value) {
        audio.value.pause();
        if (animationFrame.value) {
          cancelAnimationFrame(animationFrame.value);
        }
      } else {
        try {
          // 确保 AudioContext 处于运行状态
          if (audioContext.value && audioContext.value.state === 'suspended') {
            await audioContext.value.resume();
          }
          await audio.value.play();
          drawWaveform();
        } catch (error) {
          console.error('播放失败:', error);
        }
      }
      
      isPlaying.value = !isPlaying.value;
    };

    const updateVolume = () => {
      if (audio.value) {
        audio.value.volume = volume.value;
      }
    };

    const formatTime = (time) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    watch(() => props.audioUrl, () => {
      if (audio.value) {
        audio.value.src = props.audioUrl;
        audio.value.load();
      }
    });

    onMounted(() => {
      initAudio();
    });

    onUnmounted(() => {
      if (audio.value) {
        audio.value.pause();
        audio.value.src = '';
      }
      if (animationFrame.value) {
        cancelAnimationFrame(animationFrame.value);
      }
      if (audioContext.value) {
        audioContext.value.close();
      }
    });

    return {
      waveformCanvas,
      isPlaying,
      currentTime,
      duration,
      volume,
      togglePlay,
      updateVolume,
      formatTime
    };
  }
}
</script>

<style scoped>
.audio-waveform {
  width: 100%;
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.waveform-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.waveform-canvas {
  width: 100%;
  height: 60px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid rgba(66, 185, 131, 0.1);
}

.controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.play-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #42b983;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.play-button:hover {
  background: #3aa876;
  transform: scale(1.05);
}

.play-button i {
  font-size: 16px;
}

.time-display {
  font-size: 14px;
  color: #666;
  font-family: monospace;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.volume-control i {
  color: #42b983;
  font-size: 16px;
}

.volume-control input[type="range"] {
  width: 100px;
  height: 4px;
  -webkit-appearance: none;
  background: #e0e0e0;
  border-radius: 2px;
  outline: none;
}

.volume-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #42b983;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.volume-control input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}
</style> 