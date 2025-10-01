<template>
  <div class="container">
    <h1>アイデアを出させるアプリ</h1>

    <div class="input-area">
      <input type="text" v-model="inputText" placeholder="キーワードを入力">
    </div>

    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

    <div class="buttons">
      <button @click="generateIdea('reverse')">逆転</button>
      <button @click="generateIdea('expansion')">拡張</button>
      <button @click="generateIdea('associate')">連想</button>
      <button @click="generateIdea('perspective')">視点切替</button>
      <button @click="generateIdea('future')">未来</button>
      <button @click="generateIdea('constraint')">制約</button>
      <button @click="generateIdea('emotion')">感情</button>
      <button @click="generateIdea('random')">ランダム</button>
    </div>

    <div v-if="isLoading" class="loading-area">
      <p>AIが考え中です…</p>
    </div>

    <div v-if="generatedIdea && !isLoading" class="idea-area">
      <h2>問い（{{ currentModeLabel }}）</h2>
      <p>{{ generatedIdea }}</p>
      <small class="idea-reason" v-if="generatedReason">※理由：{{ generatedReason }}</small>
    </div>

    <div v-if="generatedIdea" class="my-idea-area">
      <h2>あなたのアイデア</h2>
      <textarea v-model="myIdeaText" placeholder="ここにアイデアを入力..."></textarea>
      <button @click="saveIdea">登録</button>
    </div>

    <div v-if="generatedExamples.length" class="example-area">
      <h2>例</h2>
      <ul>
        <li v-for="(example, index) in generatedExamples" :key="index">{{ example }}</li>
      </ul>
    </div>

    <div class="saved-ideas-area">
      <h2>テーマ一覧</h2>
      <ul v-if="Object.keys(savedIdeas).length > 0">
        <li v-for="theme in Object.keys(savedIdeas)" :key="theme" @click="selectTheme(theme)" :class="{ 'selected-theme': selectedTheme === theme }">
          {{ theme }}
          <button @click.stop="deleteTheme(theme)" class="delete-btn">テーマ削除</button>
        </li>
      </ul>
      <p v-else>まだ保存されたテーマはありません。</p>

      <div v-if="selectedTheme && savedIdeas[selectedTheme]?.length > 0" class="theme-ideas-list">
        <h3>{{ selectedTheme }} のアイデア</h3>
        <ul>
          <li v-for="(idea, index) in savedIdeas[selectedTheme]" :key="index">
            <div class="idea-content">
              <strong class="question">問い（{{ idea.mode }}）: {{ idea.question }}</strong>
              <p class="reason" v-if="idea.reason">※理由：{{ idea.reason }}</p>
              <p class="answer">アイデア: {{ idea.text }}</p>
            </div>
            <button @click.stop="deleteIdea(selectedTheme, index)" class="delete-btn">削除</button>
          </li>
        </ul>
      </div>
      <p v-else-if="selectedTheme">このテーマにはまだアイデアがありません。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const inputText = ref('');
const generatedIdea = ref('');
const generatedReason = ref('');
const generatedExamples = ref([]);
const myIdeaText = ref('');
const currentTheme = ref('');
const savedIdeas = ref({});
const selectedTheme = ref(null);
const errorMessage = ref('');
const isLoading = ref(false);
const currentModeLabel = ref('');

const generateIdea = async (mode) => {
  if (!inputText.value) {
    errorMessage.value = 'キーワードを入力してください。';
    generatedIdea.value = '';
    generatedReason.value = '';
    generatedExamples.value = [];
    return;
  }

  errorMessage.value = '';
  isLoading.value = true;

  const modeLabels = {
    reverse: '逆転',
    expansion: '拡張',
    associate: '連想',
    perspective: '視点切替',
    future: '未来',
    constraint: '制約',
    emotion: '感情'
  };

  let executionMode = mode;
  if (mode === 'random') {
    const modes = Object.keys(modeLabels);
    executionMode = modes[Math.floor(Math.random() * modes.length)];
  }
  currentModeLabel.value = modeLabels[executionMode] || '';

  const intro = `あなたは、ユーザーが入力したキーワード（課題・悩み・アイデアの種）に対して、ユーザー自身が良いアイデアを思い浮かべられるように、思考のきっかけとなる問いをやさしく提示するロボットです。\n\n`;

  const format = {
    reverse: `問い:（50文字以内で）\n理由:（問いの背景や逆転の視点を20〜40文字で）\n例:（80文字以内の答えを3つ、番号付きで）`,
    expansion: `問い:（50文字以内で）（応用分野には「」を付ける）\n理由:（どのような応用や分野を意識したかを20〜40文字で）\n例:（80文字以内の答えを3つ、番号付きで）`,
    associate: `問い:（50文字以内で）（単語には「」を付ける）\n理由:（どの単語を連想し、なぜ掛け合わせたかを20〜40文字で）\n例:（80文字以内の答えを3つ、番号付きで）`,
    perspective: `問い:（50文字以内で）\n理由:（どの視点に切り替えたか、なぜその視点かを20〜40文字で）\n例:（80文字以内の答えを3つ、番号付きで）`,
    future: `問い:（50文字以内で）（未来の要素には「」を付ける）\n理由:（どんな未来を想定したか、なぜその未来かを20〜40文字で）\n例:（80文字以内の答えを3つ、番号付きで）`,
    constraint: `問い:（50文字以内で）（制約には「」を付ける）\n理由:（どんな制約を設けたか、なぜその制約かを20〜40文字で）\n例:（80文字以内の答えを3つ、番号付きで）`,
    emotion: `問い:（50文字以内で）（感情には「」を付ける）\n理由:（どの感情を選び、なぜその感情かを20〜40文字で）\n例:（80文字以内の答えを3つ、番号付きで）`
  };

  const prompt = `${intro}「${inputText.value}」というキーワードに対して、${modeLabels[executionMode]}の視点から問いを作成してください。\n\n出力形式は以下のようにしてください：\n${format[executionMode]}`;

  try {
    const apiBase = process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : '';
    const response = await fetch(`${apiBase}/api/gemini`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    const data = await response.json();
    const text = data?.text || 'APIレスポンスが不正です';
    console.log('Gemini raw output:', text);

    const questionMatch = text.match(/(問い|質問|Q)[:：]\s*(.+)/);
    const reasonMatch = text.match(/理由[:：]\s*(.+)/);
    const examplesMatch = text.match(/例[:：]\s*\n([\s\S]*)/);







generatedIdea.value = questionMatch ? questionMatch[2].trim() : text;
    generatedExamples.value = examplesMatch
      ? examplesMatch[1]
          .split(/\n/)
          .map(e => e.trim())
          .filter(e => e)
      : [];

    currentTheme.value = inputText.value;
  } catch (e) {
    generatedIdea.value = 'APIリクエストに失敗しました';
    generatedExamples.value = [];
    errorMessage.value = 'Gemini APIエラー: ' + e.message;
  } finally {
    isLoading.value = false;
  }
};

const saveIdea = () => {
  if (!myIdeaText.value.trim() || !currentTheme.value) return;

  if (!savedIdeas.value[currentTheme.value]) {
    savedIdeas.value[currentTheme.value] = [];
  }

  savedIdeas.value[currentTheme.value].unshift({
    question: generatedIdea.value,
    text: myIdeaText.value,
    mode: currentModeLabel.value
  });
  myIdeaText.value = '';
};

const deleteIdea = (theme, index) => {
  if (savedIdeas.value[theme]) {
    savedIdeas.value[theme].splice(index, 1);
    if (savedIdeas.value[theme].length === 0) {
      delete savedIdeas.value[theme];
      if (selectedTheme.value === theme) selectedTheme.value = null;
    }
  }
};

const deleteTheme = (theme) => {
  if (confirm(`テーマ「${theme}」と、その中のすべてのアイデアを削除してもよろしいですか？`)) {
    delete savedIdeas.value[theme];
    if (selectedTheme.value === theme) selectedTheme.value = null;
  }
};

const selectTheme = (theme) => {
  selectedTheme.value = selectedTheme.value === theme ? null : theme;
};

watch(savedIdeas, (newIdeas) => {
  localStorage.setItem('savedIdeas', JSON.stringify(newIdeas));
}, { deep: true });

onMounted(() => {
  const storedIdeas = localStorage.getItem('savedIdeas');
  try {
    const parsedIdeas = JSON.parse(storedIdeas);
    savedIdeas.value = typeof parsedIdeas === 'object' && parsedIdeas !== null && !Array.isArray(parsedIdeas)
      ? parsedIdeas
      : {};
  } catch {
    savedIdeas.value = {};
  }
});
</script>

<style>
body {
  background-color: #f0f2f5;
  color: #333;
  font-family: 'Helvetica Neue', Arial, sans-serif;
}

.container {
  max-width: 700px;
  margin: 40px auto;
  padding: 30px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

h1 {
  color: #1a1a1a;
  margin-bottom: 30px;
}

.input-area {
  margin-bottom: 25px;
}

input[type="text"] {
  width: calc(100% - 24px);
  padding: 12px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: border-color 0.3s;
}

input[type="text"]:focus {
  outline: none;
  border-color: #007bff;
}

.buttons {
    display: flex;
    justify-content: center;
    gap: 15px;
    flex-wrap: wrap;
}

.buttons button {
  padding: 12px 25px;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  background-color: #007bff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, transform 0.2s;
}

.buttons button:hover {
  background-color: #0056b3;
  transform: translateY(-2px);
}

.buttons button:active {
  transform: translateY(0);
}

.idea-area, .example-area, .my-idea-area, .saved-ideas-area {
  margin-top: 20px;
  padding: 25px;
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 4px;
  text-align: left;
  line-height: 1.6;
}

.idea-area h2, .example-area h2, .my-idea-area h2, .saved-ideas-area h2 {
    margin-top: 0;
    color: #333;
}

.example-area ul, .saved-ideas-area ul {
  padding-left: 20px;
  margin: 0;
  list-style-type: none;
}

.my-idea-area textarea {
  width: calc(100% - 20px);
  height: 100px;
  padding: 10px;
  font-size: 16px;
  border-radius: 4px;
  border: 1px solid #ddd;
  margin-bottom: 10px;
}

.my-idea-area button {
  display: block;
  width: 100%;
  padding: 12px;
  font-size: 16px;
  font-weight: bold;
  color: #fff;
  background-color: #28a745;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.my-idea-area button:hover {
  background-color: #218838;
}

.saved-ideas-area li {
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.saved-ideas-area .question {
  font-size: 0.9em;
  color: #666;
  display: block;
  margin-bottom: 5px;
}

.saved-ideas-area .answer {
  margin: 0;
}

.saved-ideas-area .delete-btn {
  padding: 5px 10px;
  font-size: 12px;
  color: #fff;
  background-color: #dc3545;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.saved-ideas-area .delete-btn:hover {
  background-color: #c82333;
}

.saved-ideas-area ul li {
  cursor: pointer;
  margin-bottom: 5px;
  padding: 8px 12px;
  border: 1px solid #eee;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
}

.saved-ideas-area ul li:hover {
  background-color: #f0f0f0;
}

.saved-ideas-area ul li.selected-theme {
  background-color: #e0f7fa;
  border-color: #00bcd4;
  font-weight: bold;
}

.theme-ideas-list {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.theme-ideas-list h3 {
  margin-top: 0;
  color: #333;
  text-align: center;
  margin-bottom: 15px;
}

.error-message {
  color: #dc3545;
  font-weight: bold;
  margin-bottom: 10px;
  text-align: center;
}
</style>