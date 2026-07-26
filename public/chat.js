import { auth, sdb, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let currentUser = null;
let currentChatPartnerId = null;
let allContacts = []; // Store all contacts to filter

const contactList = document.getElementById('contact-list');
const chatPlaceholder = document.getElementById('chat-placeholder');
const activeChatWindow = document.getElementById('active-chat-window');
const chatPartnerProfilePic = document.getElementById('chat-partner-profile-pic');
const chatPartnerName = document.getElementById('chat-partner-name');
const chatPartnerStatus = document.getElementById('chat-partner-status');
const messageHistory = document.getElementById('message-history');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const searchBar = document.getElementById('search-bar');

// Add this at the beginning of your chat.js file
const urlParams = new URLSearchParams(window.location.search);
const initialPartnerId = urlParams.get('partnerId');

if (initialPartnerId) {
    // You'll need to fetch the partner's data based on their ID
    const partnerDocRef = doc(sdb, "users", initialPartnerId);
    const partnerDoc = await getDoc(partnerDocRef);
    if (partnerDoc.exists()) {
        const partnerData = partnerDoc.data();
        startChatWith({ ...partnerData, uid: initialPartnerId });
    }
}
// In chat.js, at the very beginning of the script
// ... (imports and variable declarations)

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        loadContacts();

        // Check for a partnerId in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const partnerId = urlParams.get('partnerId');

        if (partnerId) {
            // Fetch the partner's data from Firestore
            const partnerDoc = await getDoc(doc(sdb, "users", partnerId));
            if (partnerDoc.exists()) {
                const partnerData = partnerDoc.data();
                // Start the chat with the matched user
                startChatWith({ uid: partnerId, ...partnerData });
            }
        }
    } else {
        window.location.href = 'login.html';
    }
});

// Load contacts from the matches page data
async function loadContacts() {
    // In loadContacts function
    try {
        const matchesResponse = await fetch('http://localhost:3000/api/findMatches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.uid })
        });
        allContacts = await matchesResponse.json(); // Store all contacts
        renderContacts(allContacts); // Render the initial list

    } catch (error) {
        console.error("Failed to load contacts:", error);
    }
}

// Function to render contacts
function renderContacts(contactsToRender) {
    contactList.innerHTML = '';
    contactsToRender.forEach(match => {
        const contactItem = document.createElement('div');
        contactItem.className = 'contact-list-item p-4 flex items-center space-x-4 border-b border-gray-200';
        contactItem.innerHTML = `
            <img src="${match.profileImageUrl || 'user.png'}" alt="Profile" class="w-12 h-12 rounded-full object-cover">
            <div>
                <h3 class="font-semibold text-gray-800">${match.name}</h3>
                <p class="text-sm text-gray-500">Start a conversation</p>
            </div>
        `;
        // console.log(match.matchUserId)
        contactItem.addEventListener('click', () => startChatWith(match));
        contactList.appendChild(contactItem);
    });
}


// Function to start a chat with a selected user
function startChatWith(partner) {
    console.log(partner.matchUserId)
    currentChatPartnerId = partner.matchUserId;
    chatPlaceholder.classList.add('hidden');
    activeChatWindow.classList.remove('hidden');

    chatPartnerProfilePic.src = partner.profileImageUrl || 'user.png';
    chatPartnerName.textContent = partner.name;

    // Load and listen for messages in real-time
    loadMessages(currentUser.uid, partner.matchUserId);
}

// Function to load and display messages
function loadMessages(user1Id, user2Id) {
    const chatId = getChatId(user1Id, user2Id);
    const messagesRef = collection(sdb, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp'));

    // Real-time listener for new messages
    onSnapshot(q, (snapshot) => {
        // Clear the message history only on the initial load, or handle new messages differently
        // snapshot.docChanges() helps identify new documents
        messageHistory.innerHTML = "";
        snapshot.docs.forEach(doc => {
            const message = doc.data();
            renderMessage(message);
        });
        messageHistory.scrollTop = messageHistory.scrollHeight; // Auto-scroll to bottom
    });
}
// Function to send a new message
// Add this code to your existing chat.js file
function sendMessage() {
    const messageText = messageInput.value.trim();
    console.log(messageText)

    // Check if the message is not empty and a chat partner is selected
    if (messageText && currentChatPartnerId) {
        // console.log(currentChatPartnerId)
        try {
            // Get the chat ID (consistent for both users)
            const chatId = getChatId(currentUser.uid, currentChatPartnerId);

            // Reference to the messages collection for this chat
            const messagesRef = collection(sdb, 'chats', chatId, 'messages');

            // Add the new message document to the collection
            addDoc(messagesRef, {
                senderId: currentUser.uid,
                text: messageText,
                timestamp: serverTimestamp() // Add a server-side timestamp
            });

            // Clear the input field after sending
            messageInput.value = '';

        } catch (error) {
            console.error("Error sending message:", error);
            // You can add an alert here to inform the user
        }
    }
}


sendBtn.addEventListener('click', sendMessage);

// Event listener for the Enter key on the message input field
messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevents a newline from being added to the input field
        sendMessage();
    }
});

// Event listener for the search bar
searchBar.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const filteredContacts = allContacts.filter(contact => 
        contact.name.toLowerCase().includes(searchTerm)
    );
    renderContacts(filteredContacts);
});

// Also, you'll need the getChatId helper function to ensure a consistent chat ID is used
function getChatId(user1Id, user2Id) {
    return user1Id < user2Id ? `${user1Id}-${user2Id}` : `${user2Id}-${user1Id}`;
}

// Function to render a single message in the UI
function renderMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `p-3 max-w-xs break-words ${message.senderId === currentUser.uid ? 'my-message ml-auto' : 'other-message mr-auto'}`;
    messageElement.innerHTML = `
        <p>${message.text}</p>
        <span class="text-xs mt-1 text-gray-400 block text-right">${message.timestamp ? new Date(message.timestamp.toDate()).toLocaleTimeString() : '...'}</span>
    `;
    messageHistory.appendChild(messageElement);
}

