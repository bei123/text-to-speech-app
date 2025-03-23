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
          <span class="textLink" @click="copyLink">https://github.com/RVC-Boss/GPT-SoVITS</span>
          <h2 class="sectionTitle">GPT-SoVITS开发者</h2>
          <div class="cardContainer">
            <div v-for="(item, index) in GSVDeveloper" :key="index" class="card">
              <img class="cardImage" :src="item.avatar" :alt="item.name" @error="handleImageError" />
              <span class="cardText">{{ item.name }}</span>
            </div>
          </div>
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
      <span class="footerText">QQ交流群：621244714</span>
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// 返回上一页
const goBack = () => {
  router.back();
};

// 数据
const voiceModelProviders = ref([
  { name: "@白菜工厂1145号员工", avatar: "http://wp.2000gallery.art:12345/?explorer/share/file&hash=05cbkovzGmIo5yFijIwGsqKwPRfgCf6MER92kwfyVgYMExGWY513evqYHfr3mtskGY5gdcLV" },
  { name: "@熙式甜点", avatar: "http://wp.2000gallery.art:12345/?explorer/share/file&hash=b0f4cECYwnzg0VEei7yEUhtEnPiOr-41W4oLpLl9NwySNnVZR1T3IGgwMJcxmbo4lWHzQdlo" },
  { name: "@天冬天冬", avatar: "http://wp.2000gallery.art:12345/?explorer/share/file&hash=4c93iYZa1wvtsLJnWvMYUesDx0IdWoZmaBtS2n9sVMKk3HdGfhDZGsbRfy0IOmXYRg5L1BVd" }
]);

const gpuSponsors = ref([
  { name: "@熙式甜点", avatar: "http://wp.2000gallery.art:12345/?explorer/share/file&hash=165aTnIcy47SmaDKVNwRNfi7Ik6tCyPRt8UvMUjKYLm6qKcg3OKCSFPDOt9tf2GhP915JIrB" }
]);

const authors = ref([
  { name: "@天冬天冬", avatar: "http://wp.2000gallery.art:12345/?explorer/share/file&hash=4c93iYZa1wvtsLJnWvMYUesDx0IdWoZmaBtS2n9sVMKk3HdGfhDZGsbRfy0IOmXYRg5L1BVd" }
]);

const GSVDeveloper = ref([
  { name: "@花儿不哭", avatar: "http://wp.2000gallery.art:12345/?explorer/share/file&hash=50c82Jpxtw_9aO90Z1wvyWJvTxy5--N3ZUllGwNEcEeB72PJMetdxBez-7wHlwYhrqwaRqRr" }
]);

const copyLink = () => {
  const link = "https://github.com/RVC-Boss/GPT-SoVITS";

  // 检测是否为移动设备
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // 移动端：复制链接并提示
    navigator.clipboard.writeText(link)
      .then(() => {
        alert("已复制，请在浏览器中打开", 'success');
      })
      .catch((error) => {
        console.error("复制失败:", error);
        alert("复制失败，请手动复制链接", 'error');
      });
  } else {
    // PC端：在新标签页中打开链接
    window.open(link, '_blank');
  }
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