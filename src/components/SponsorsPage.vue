<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-links">
        <router-link to="/" class="nav-link">Home</router-link>
        <router-link to="/history" class="nav-link">生成记录</router-link>
      </div>
    </nav>
    <router-view></router-view>

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
    <p>© 2025 Ai 语音生命</p>
  </footer>
</template>

<script setup>
import { ref } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';

// 数据
const voiceModelProviders = ref([
  { name: "@白菜工厂1145号员工", avatar: "http://wp.2000gallery.art:12345/?explorer/share/file&hash=339cusijah2f4-mOVX_LlYAuwT_vIQtZ-NrhqChoyAC0DIkD09ZalHjtRS6_mN_GnvEnBYID" },
  { name: "@熙式甜点", avatar: "http://wp.2000gallery.art:12345/?explorer/share/file&hash=294b-g5aWxAKNS-hbjWn17uiwy-Jk5eeG5BQrdy25m3EJoL8tUiW6IfbF_ZSg8Lh6a9Gsxes" },
  { name: "@天冬天冬", avatar: "http://wp.2000gallery.art:12345/?explorer/share/file&hash=492drdEvk6DNbt3bvzDq01oBNqIQZOCI4l2EuXbN3e6MxMNUuYuBuNlXpChRylIzEYVtlDCl" }
]);

const gpuSponsors = ref([
  { name: "@熙式甜点", avatar: "http://wp.2000gallery.art:12345/?explorer/share/file&hash=294b-g5aWxAKNS-hbjWn17uiwy-Jk5eeG5BQrdy25m3EJoL8tUiW6IfbF_ZSg8Lh6a9Gsxes" }
]);

const authors = ref([
  { name: "@天冬天冬", avatar: "http://wp.2000gallery.art:12345/?explorer/share/file&hash=492drdEvk6DNbt3bvzDq01oBNqIQZOCI4l2EuXbN3e6MxMNUuYuBuNlXpChRylIzEYVtlDCl" }
]);

const GSVDeveloper = ref([
  { name: "@花儿不哭", avatar: "http://wp.2000gallery.art:12345/?explorer/share/file&hash=e9f1aNyZzhKuVpndyTokIkPqD5NfCUIdJttgR-FsWW8Dz7mIMCT2YnJ20GWqDwLsMYwcGAQl" }
]);

// 复制链接
const copyLink = () => {
  const link = "https://github.com/RVC-Boss/GPT-SoVITS";
  navigator.clipboard.writeText(link)
    .then(() => {
      alert("链接已复制");
    })
    .catch((error) => {
      console.error("复制失败:", error);
      alert("复制失败，请手动复制链接");
    });
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
}

.navigatorBtn {
  cursor: pointer;
}

.navigatorIcon {
  font-size: 24px;
  color: #000;
}

.topText {
  font-size: 20px;
  font-weight: bold;
  margin-left: 10px;
}

.content {
  flex: 1;
}

.section {
  margin-bottom: 20px;
}

.sectionTitle {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 10px;
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
  color: #007BFF;
  cursor: pointer;
}

.cardContainer {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.card {
  display: flex;
  align-items: center;
  background-color: #f1f1f1;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  width: calc(50% - 5px);
}

.cardImage {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  margin-right: 10px;
}

.cardText {
  font-size: 14px;
  color: #333;
}

.footer {
  text-align: center;
  padding: 20px;
  background-color: #f9f9f9;
  border-top: 1px solid #eee;
}

.footerText {
  font-size: 14px;
  color: #666;
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