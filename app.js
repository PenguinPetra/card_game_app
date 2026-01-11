// カードデータの生成（52枚）
// ペアの定義：同じ数字(Rank) かつ 同じ色(Color)
// 黒: スペード(♠), クラブ(♣)
// 赤: ハート(♥), ダイヤ(♦)
const suits = [
    { mark: '♠', color: 'black', name: 'spade' },
    { mark: '♣', color: 'black', name: 'club' },
    { mark: '♥', color: 'red', name: 'heart' },
    { mark: '♦', color: 'red', name: 'diamond' }
];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let deck = [];

// デッキ生成（ID: 0〜51）
let idCounter = 0;
suits.forEach(suit => {
    ranks.forEach(rank => {
        deck.push({
            id: idCounter++,
            suit: suit.mark,
            color: suit.color,
            rank: rank,
            displayName: `${suit.mark}${rank}`
        });
    });
});

// ゲーム状態
let gameState = {
    foundPairs: [],   // ペア成立済みのカードID
    flippedCards: []  // 現在めくっているカードID
};

const STORAGE_KEY = 'walkingTrumpGame_52';

// 初期化
function init() {
    loadState();
    
    // URLパラメータの確認 (?id=XX)
    const urlParams = new URLSearchParams(window.location.search);
    const scannedId = urlParams.get('id');

    if (scannedId !== null) {
        handleScan(parseInt(scannedId));
    }

    renderGrid();
}

// スキャン処理
function handleScan(index) {
    if (index < 0 || index >= deck.length) {
        alert("無効なQRコードです");
        return;
    }
    if (gameState.foundPairs.includes(index)) {
        alert("このカードは既に獲得済みです！");
        return;
    }
    if (gameState.flippedCards.includes(index)) {
        alert("このカードは既にめくっています");
        return;
    }

    // 既に2枚めくられていてハズレだった場合、リセットして新しい1枚目とする
    if (gameState.flippedCards.length === 2) {
        gameState.flippedCards = [];
    }

    gameState.flippedCards.push(index);
    saveState();

    // 2枚目なら判定
    if (gameState.flippedCards.length === 2) {
        setTimeout(checkMatch, 300); // 描画後に判定
    } else {
        alert(`1枚目: ${deck[index].displayName}\n次のカードを探してください！`);
    }

    // URLパラメータ削除（リロード対策）
    window.history.replaceState({}, document.title, window.location.pathname);
}

// ペア判定
function checkMatch() {
    const [id1, id2] = gameState.flippedCards;
    const card1 = deck[id1];
    const card2 = deck[id2];

    // 判定ルール: 同じ数字(rank) かつ 同じ色(color) ならペア
    // 例: スペードA と クラブA はペア。スペードA と ハートA はハズレ。
    const isMatch = (card1.rank === card2.rank) && (card1.color === card2.color);

    if (isMatch) {
        gameState.foundPairs.push(id1, id2);
        gameState.flippedCards = [];
        alert(`🎉 ペア成立！\n${card1.displayName} と ${card2.displayName}`);
    } else {
        alert(`😢 残念、ハズレ！\n${card1.displayName} と ${card2.displayName}\n（次は1枚目からやり直しです）`);
        // ハズレの場合、画面上は開いたままにするが、次のスキャンでリセットされる
    }
    saveState();
    renderGrid();
}

// 描画
function renderGrid() {
    const grid = document.getElementById('card-grid');
    grid.innerHTML = '';

    deck.forEach(card => {
        const div = document.createElement('div');
        div.className = 'card';
        
        const isOpen = gameState.foundPairs.includes(card.id) || gameState.flippedCards.includes(card.id);
        const isMatched = gameState.foundPairs.includes(card.id);

        if (isOpen) {
            div.classList.add('open');
            div.classList.add(card.color); // red or black
            div.textContent = card.displayName;
        }

        if (isMatched) {
            div.classList.add('matched');
        }

        grid.appendChild(div);
    });

    // 完了判定
    if (gameState.foundPairs.length === deck.length) {
        document.getElementById('status-text').textContent = "🎊 全制覇！おめでとう！ 🎊";
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
}

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        gameState = JSON.parse(saved);
    }
}

// リセットボタン
document.getElementById('reset-btn').addEventListener('click', () => {
    if(confirm("ゲームをリセットしますか？")) {
        localStorage.removeItem(STORAGE_KEY);
        gameState = { foundPairs: [], flippedCards: [] };
        renderGrid();
        alert("リセットしました");
    }
});

init();