<template>
  <div id="app">
    <!-- <nav class="navbar">
      <div class="nav-links">
        <router-link to="/" class="nav-link">Home</router-link>
        <router-link to="/history" class="nav-link">生成记录</router-link>
      </div>
    </nav>
    <router-view></router-view> -->

  </div>
  <div class="container">
    <!-- 顶部导航 -->
    <div class="topBar">
      <v-btn icon @click="goBack" class="navigatorBtn">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <span class="topText">为爱发电的人们</span>
    </div>

    <!-- 内容区域 -->
    <div class="content">
      <!-- GitHub 项目地址 -->
      <div class="section">
        <h2 class="sectionTitle">本软件基于GPT-SoVITS开发</h2>
        <div class="sectionContent">
          <span class="textUse01">GitHub项目地址:</span>
          <span class="textLink" @click="copyGptSoVitsLink">https://github.com/RVC-Boss/GPT-SoVITS</span>
          <h2 class="sectionTitle">GPT-SoVITS开发者</h2>
          <div class="cardContainer">
            <div v-for="(item, index) in GSVDeveloper" :key="index" class="card">
              <img class="cardImage" :src="item.avatar" :alt="item.name" @error="handleImageError" />
              <span class="cardText">{{ item.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 本项目开源仓库 -->
      <div class="section">
        <h2 class="sectionTitle">本项目开源仓库</h2>
        <div class="sectionContent">
          <span class="textUse01">GitHub项目地址:</span>
          <span class="textLink" @click="copyProjectLink">https://github.com/bei123/text-to-speech-app</span>
        </div>
      </div>

      <!-- 语音模型提供 -->
      <div class="section">
        <h2 class="sectionTitle">语音模型提供</h2>
        <div class="cardContainer">
          <div v-for="(item, index) in voiceModelProviders" :key="index" class="card">
            <img class="cardImage" :src="item.avatar" :alt="item.name" @error="handleImageError" />
            <span class="cardText">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- GPU算力赞助 -->
      <div class="section">
        <h2 class="sectionTitle">GPU算力赞助</h2>
        <div class="cardContainer">
          <div v-for="(item, index) in gpuSponsors" :key="index" class="card">
            <img class="cardImage" :src="item.avatar" :alt="item.name" @error="handleImageError" />
            <span class="cardText">{{ item.name }}</span>
          </div>
        </div>
      </div>

      <!-- 软件作者 -->
      <div class="section">
        <h2 class="sectionTitle">软件作者</h2>
        <div class="cardContainer">
          <div v-for="(item, index) in authors" :key="index" class="card">
            <img class="cardImage" :src="item.avatar" :alt="item.name" @error="handleImageError" />
            <span class="cardText">{{ item.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部提示 -->
    <div class="footer">
      <span class="footerText">如果你有好的模型提供,或愿意赞助GPU算力,请联系我!</span>
      <span class="footerText">
        QQ交流群：
        <a class="textLink" :href="qqGroupLink" target="_blank">621244714</a>
      </span>
    </div>
  </div>
  <div>
    <span></span>
  </div>
  <footer>
    <!-- 页脚内容 -->
    <!-- <p>© 2025 Ai 语音生命</p> -->
  </footer>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// 返回上一页
const goBack = () => {
  router.back();
};

// 数据
const voiceModelProviders = ref([
  { name: "@白菜工厂1145号员工", avatar: "https://oss.2000gallery.art/Sponsorimage/baicaigongc1145.webp?image_process=resize,fw_80,fh_80" },
  { name: "@熙式甜点", avatar: "https://oss.2000gallery.art/Sponsorimage/ystd.webp?image_process=resize,fw_80,fh_80" },
  { name: "@天冬天冬", avatar: "https://oss.2000gallery.art/Sponsorimage/tdxa.webp?image_process=resize,fw_80,fh_80" }
]);

const gpuSponsors = ref([
  { name: "@熙式甜点", avatar: "https://oss.2000gallery.art/Sponsorimage/ystd.webp?image_process=resize,fw_80,fh_80" }
]);

const authors = ref([
  { name: "@天冬天冬", avatar: "https://oss.2000gallery.art/Sponsorimage/tdxa.webp?image_process=resize,fw_80,fh_80" }
]);

const GSVDeveloper = ref([
  { name: "@花儿不哭", avatar: "https://oss.2000gallery.art/Sponsorimage/huaerbku.webp?image_process=resize,fw_80,fh_80" }
]);

// 预加载所有图片
const preloadImages = () => {
  const allImages = [
    ...voiceModelProviders.value,
    ...gpuSponsors.value,
    ...authors.value,
    ...GSVDeveloper.value
  ];

  const uniqueUrls = new Set(allImages.map(item => item.avatar));
  uniqueUrls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
};

// 组件挂载时预加载图片
onMounted(() => {
  preloadImages();
});

const copyGptSoVitsLink = () => {
  const link = "https://github.com/RVC-Boss/GPT-SoVITS";
  copyOrOpenLink(link);
};

const copyProjectLink = () => {
  const link = "https://github.com/bei123/text-to-speech-app";
  copyOrOpenLink(link);
};

const qqGroupLink = "https://qm.qq.com/q/vs9jVLpNQs";

const copyOrOpenLink = (link, isQQGroup = false) => {
  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // 创建临时输入框来实现更可靠的复制功能
    const tempInput = document.createElement('input');
    tempInput.value = link;
    document.body.appendChild(tempInput);
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); // 适用于iOS

    try {
      // 尝试使用document.execCommand进行复制（更广泛支持）
      const successful = document.execCommand('copy');
      if (successful) {
        showToast(isQQGroup ? "已复制，请在QQ中打开" : "已复制，请在浏览器中打开");
      } else {
        // 如果execCommand失败，尝试使用clipboard API
        navigator.clipboard.writeText(link)
          .then(() => {
            showToast(isQQGroup ? "已复制，请在QQ中打开" : "已复制，请在浏览器中打开");
          })
          .catch(() => {
            // 如果都失败了，提示用户手动复制
            showToast(`复制失败，请手动复制: ${link}`, false);
          });
      }
    } catch (err) {
      // 如果出现异常，再尝试使用clipboard API
      navigator.clipboard.writeText(link)
        .then(() => {
          showToast(isQQGroup ? "已复制，请在QQ中打开" : "已复制，请在浏览器中打开");
        })
        .catch(() => {
          // 如果都失败了，提示用户手动复制
          showToast(`复制失败，请手动复制: ${link}`, false);
        });
    } finally {
      // 删除临时输入框
      document.body.removeChild(tempInput);
    }
  } else {
    // PC端：在新标签页中打开链接
    window.open(link, '_blank');
  }
};

// 显示自定义Toast提示
const showToast = (message, success = true) => {
  // 删除可能存在的旧toast
  const existingToast = document.getElementById('custom-toast');
  if (existingToast) {
    document.body.removeChild(existingToast);
  }

  // 创建toast元素
  const toast = document.createElement('div');
  toast.id = 'custom-toast';
  toast.innerText = message;

  // 设置toast样式
  toast.style.position = 'fixed';
  toast.style.bottom = '30px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.backgroundColor = success ? '#42b983' : '#e74c3c';
  toast.style.color = 'white';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '8px';
  toast.style.zIndex = '9999';
  toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  toast.style.fontWeight = '500';
  toast.style.fontSize = '14px';
  toast.style.textAlign = 'center';
  toast.style.minWidth = '200px';
  toast.style.opacity = '0';
  toast.style.transition = 'opacity 0.3s ease-in-out';

  // 添加到body
  document.body.appendChild(toast);

  // 显示toast (使用setTimeout来确保CSS过渡效果生效)
  setTimeout(() => {
    toast.style.opacity = '1';
  }, 10);

  // 3秒后隐藏
  setTimeout(() => {
    toast.style.opacity = '0';
    // 完全隐藏后移除元素
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
};

// 处理图片加载失败
const handleImageError = (event) => {
  event.target.src = "https://example.com/default-avatar.png"; // 默认头像
};
</script>

<style lang="scss" scoped>
/* 导航栏样式 */
.navbar {
  background: linear-gradient(135deg, #42b983, #3aa876);
  padding: 10px 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  justify-content: center;
  align-items: center;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-link {
  color: white;
  text-decoration: none;
  font-size: 16px;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 8px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.nav-link.router-link-exact-active {
  background-color: rgba(255, 255, 255, 0.2);
}

.container {
  max-width: 800px;
  margin: 20px auto;
  padding: 24px;
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.topBar {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.navigatorBtn {
  margin-right: 12px;
  color: #42b983;
}

.topText {
  font-size: 18px;
  font-weight: 600;
  color: #2c3e50;
}

.content {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
}

.section {
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.section:last-child {
  margin-bottom: 0;
}

.sectionTitle {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.sectionTitle::before {
  content: '';
  width: 3px;
  height: 16px;
  background-color: #42b983;
  margin-right: 8px;
  border-radius: 2px;
}

.sectionContent {
  margin: 12px 0;
}

.textUse01 {
  font-size: 14px;
  color: #666;
}

.textLink {
  color: #42b983;
  cursor: pointer;
  text-decoration: underline;
  margin-left: 8px;
  font-size: 14px;
}

.cardContainer {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background-color: #fff;
  border-radius: 8px;
  transition: all 0.3s ease;
  border: 1px solid #e0e0e0;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
}

.cardImage {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin-bottom: 8px;
  object-fit: cover;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.cardText {
  font-size: 14px;
  color: #2c3e50;
  text-align: center;
  font-weight: 500;
}

.footer {
  margin-top: 24px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  text-align: center;
}

.footerText {
  display: block;
  margin: 6px 0;
  color: #666;
  font-size: 13px;
}

@media (max-width: 600px) {
  .container {
    margin: 10px;
    padding: 16px;
  }

  .cardContainer {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }

  .cardImage {
    width: 60px;
    height: 60px;
  }
}
</style>