// カードデータの生成（52枚）
const suits = [
    { mark: '♠', color: 'black', name: 'spade' },
    { mark: '♣', color: 'black', name: 'club' },
    { mark: '♥', color: 'red', name: 'heart' },
    { mark: '♦', color: 'red', name: 'diamond' }
];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let deck = [];
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

let gameState = {
    foundPairs: [],   // ペア成立済みのカードID
    flippedCards: []  // 現在めくっているカードID
};

const STORAGE_KEY = 'walkingTrumpGame_52';
let html5QrCode; 

// 初期化
function init() {
    loadState();
    
    // URLパラメータのチェック
    const urlParams = new URLSearchParams(window.location.search);
    const scannedId = urlParams.get('id');
    if (scannedId !== null) {
        handleScan(parseInt(scannedId));
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    renderGrid();
}

// --- スキャナー処理 ---
document.getElementById('scan-btn').addEventListener('click', startScanner);
document.getElementById('close-scan-btn').addEventListener('click', stopScanner);

function startScanner() {
    const container = document.getElementById('reader-container');
    container.style.display = 'block';
    document.getElementById('close-scan-btn').style.display = 'inline-block';

    html5QrCode = new Html5Qrcode("reader");
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch(err => {
        alert("カメラ起動エラー: " + err);
    });
}

function stopScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            document.getElementById('reader-container').style.display = 'none';
            html5QrCode.clear();
        }).catch(err => console.error(err));
    }
}

function onScanSuccess(decodedText, decodedResult) {
    stopScanner();
    try {
        let idVal = null;
        if (decodedText.includes('?')) {
            const urlObj = new URL(decodedText);
            idVal = urlObj.searchParams.get('id');
        } 
        if (!idVal && !isNaN(decodedText)) idVal = decodedText;

        if (idVal !== null) {
            handleScan(parseInt(idVal));
        } else {
            alert("無効なQRコードです");
        }
    } catch (e) {
        alert("読み取りエラー");
    }
}

// --- ▼▼▼ ここが修正したhandleScan関数です ▼▼▼ ---
function handleScan(index) {
    if (index < 0 || index >= deck.length) {
        alert("無効なカードIDです");
        return;
    }
    
    // 獲得済みチェック
    if (gameState.foundPairs.includes(index)) {
        alert(`【${deck[index].displayName}】\n獲得済みです`);
        return;
    }

    // ★重要変更点★
    // 「既にめくっているか」のチェックの前に、
    // 「前のターンが終わっているか（2枚めくられたままか）」をチェックしてリセットします。
    // これにより、ハズレた直後のカードをすぐに1枚目としてスキャンできるようになります。
    if (gameState.flippedCards.length === 2) {
        gameState.flippedCards = []; // 前の2枚を閉じる（記憶から消す）
        renderGrid(); // 画面上も閉じる
    }

    // ここでチェックすれば、「今のターンで同じカードを2回スキャンした」場合のみ弾かれます
    if (gameState.flippedCards.includes(index)) {
        alert(`【${deck[index].displayName}】\n既にめくっています（2枚目を探してください）`);
        return;
    }

    // カードをめくる処理
    gameState.flippedCards.push(index);
    saveState();
    renderGrid();

    // メッセージ表示
    const card = deck[index];
    document.getElementById('status-text').textContent = `出たカード: ${card.displayName}`;
    
    // 2枚目なら判定
    if (gameState.flippedCards.length === 2) {
        setTimeout(checkMatch, 500);
    } else {
        setTimeout(() => alert(`1枚目: ${card.displayName}\n次のカードを探してください！`), 100);
    }
}
// --- ▲▲▲ 修正ここまで ▲▲▲ ---


// ペア判定
function checkMatch() {
    const [id1, id2] = gameState.flippedCards;
    const card1 = deck[id1];
    const card2 = deck[id2];

    // 色は関係なく、数字(rank)が同じなら正解とする
    const isMatch = (card1.rank === card2.rank);

    if (isMatch) {
        gameState.foundPairs.push(id1, id2);
        gameState.flippedCards = []; 
        alert(`🎉 ペア成立！\n${card1.displayName} と ${card2.displayName}`);
    } else {
        alert(`😢 残念、ハズレ！\n${card1.displayName} と ${card2.displayName}\n（次は1枚目からやり直しです）`);
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
            div.classList.add(card.color);
            div.textContent = card.displayName;
        }

        if (isMatched) {
            div.classList.add('matched');
        }

        grid.appendChild(div);
    });

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

document.getElementById('reset-btn').addEventListener('click', () => {
    if(confirm("リセットしますか？")) {
        localStorage.removeItem(STORAGE_KEY);
        gameState = { foundPairs: [], flippedCards: [] };
        renderGrid();
        document.getElementById('status-text').textContent = "リセットしました";
    }
});

init();