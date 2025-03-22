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
      <navigator open-type="navigateBack" class="navigatorBtn">
        <font-awesome-icon :icon="['fas', 'arrow-left']" class="navigatorIcon" />
      </navigator>
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
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';




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
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

.topBar {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.navigatorBtn {
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background-color 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.navigatorBtn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.navigatorIcon {
  font-size: 20px;
  color: #42b983;
}

.topText {
  font-size: 20px;
  font-weight: 600;
  margin-left: 16px;
  color: #333;
}

.content {
  flex: 1;
}

.section {
  margin-bottom: 20px;
}

.sectionTitle {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #2c3e50;
  display: flex;
  align-items: center;
}

.sectionTitle::before {
  content: '';
  width: 4px;
  height: 18px;
  background-color: #42b983;
  margin-right: 8px;
  border-radius: 2px;
}

.sectionContent {
  margin: 10px 0;
}

.textUse01 {
  font-size: 16px;
  color: #333;
}

.textLink {
  font-size: 16px;
  color: #42b983;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.3s ease;
}

.textLink:hover {
  color: #3aa876;
  text-decoration: underline;
}

.cardContainer {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.card {
  display: flex;
  align-items: center;
  background-color: white;
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  width: calc(50% - 5px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid #eee;
}

.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.cardImage {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  margin-right: 12px;
  object-fit: cover;
  border: 2px solid #42b983;
}

.cardText {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.footer {
  text-align: center;
  padding: 24px;
  background-color: #f8f9fa;
  border-top: 1px solid #eee;
  margin-top: 40px;
}

.footerText {
  display: block;
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 8px;
}

.footerText:last-child {
  margin-bottom: 0;
  color: #42b983;
  font-weight: 500;
}

@media (min-width: 768px) {
  .card {
    width: calc(33.33% - 7px);
  }
}

@media (min-width: 1024px) {
  .card {
    width: calc(25% - 8px);
  }

  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
</style>