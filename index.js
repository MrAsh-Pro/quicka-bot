const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');

// 1. LOCAL WEB SERVER
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Quicka Bot is Alive! 🚲'));
app.listen(PORT, () => console.log(`Web server running on port ${PORT}`));

// 2. INITIALIZE WHATSAPP CLIENT (WORKS ON WINDOWS AND LINUX VPS)
const CHROME_PATH = process.env.CHROME_PATH || (
    process.platform === 'win32'
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        : '/usr/bin/google-chrome-stable'
);
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './wwebjs_auth'
    }),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.3000.1018.0-web-lite.html'
    },
    puppeteer: {
        executablePath: CHROME_PATH,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--disable-extensions'
        ],
        handleSIGINT: false
    }
});

const userStates = new Map();

client.on('qr', (qr) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
    console.log('\n-----------------------------------------------------');
    console.log('SCAN YOUR WHATSAPP QR CODE AT THE LINK BELOW:');
    console.log(qrUrl);
    console.log('-----------------------------------------------------\n');
});

client.on('ready', () => {
    console.log('Quicka Automation Bot is active and running!');
});

client.on('message', async (msg) => {
    const sender = msg.from;
    const customerPhone = sender.replace('@c.us', '').replace('@g.us', '').split(':')[0].trim();
    const myPersonalNumber = '2348087159277@c.us'; 

    // PAYMENT SCREENSHOT INTERCEPTOR
    if (msg.hasMedia) {
        const mediaType = msg.type;
        if (mediaType === 'image' || mediaType === 'document') {
            await msg.reply("⏳ *Please wait, confirming payment...*");
            const directChatLink = `https://wa.me/${customerPhone}`;
            await client.sendMessage(
                myPersonalNumber, 
                `🔔 *QUICKA PAYMENT ALERT!*\n\n` +
                `• *Customer:* +${customerPhone}\n` +
                `• *Action Required:* Check this chat immediately to verify the payment and assign a courier!\n\n` +
                `👉 *Tap to chat with customer:* ${directChatLink}`
            );
            userStates.delete(sender);
            return; 
        }
    }

    const text = msg.body ? msg.body.trim() : '';

    const sendMainMenu = async () => {
        userStates.set(sender, 'MAIN_MENU');
        await msg.reply(
            "Welcome to Quicka! 🚲\nEasing campus lifestyle.\n\n" +
            "Reply with the number of the service you need:\n" +
            "*1.* Food Run 🍔\n" +
            "*2.* Parcel Dispatch 📦\n" +
            "*3.* Urgent Errand 🏃‍♂️\n" +
            "*4.* I am a Vendor 📦\n\n" +
            "*Please note:* To keep our bicycle couriers safe and fast, we can only accept packages under *7 kg* that fit inside a standard backpack. Thank you for helping us deliver your items safely!"
        );
    };

    const sendPaymentCheckout = async () => {
        userStates.set(sender, 'AWAITING_SCREENSHOT');
        await msg.reply(
            "💰 *Delivery Rates:*\n" +
            "• Within Main Campus: ₦350\n" +
            "• Phase 2, Staff Quarters & Others: ₦500\n\n\n" +
            "💳 *Payment Details:*\n" +
            "Bank: OPAY\n" +
            "Account Number: 8087159277\n" +
            "Account Name: Shuaib Abdulhafiz\n\n" +
            "👉 *Please send a screenshot of the transfer once payment is made to confirm your booking.*\n\n" +
            "↩️ _Reply with *0* to return to the Main Menu._"
        );
    };

    const currentState = userStates.get(sender) || 'MAIN_MENU';

    if (text === '0' || text.toLowerCase() === 'back' || text.toLowerCase() === 'hello' || text.toLowerCase() === 'hi') {
        await sendMainMenu();
        return;
    }
    if (currentState === 'AWAITING_SCREENSHOT') {
        await msg.reply("Please send a screenshot of the payment transfer so our riders can begin your delivery immediately. 🚲");
        return;
    }
    if (currentState === 'FILLING_FOOD' || currentState === 'FILLING_SEND' || currentState === 'FILLING_RECEIVE' || currentState === 'FILLING_VENDOR') {
        await sendPaymentCheckout();
        return;
    }

    if (currentState === 'MAIN_MENU') {
        if (text === '1') {
            userStates.set(sender, 'FILLING_FOOD');
            await msg.reply(
                "🍔 *Food Run Option*\n\n" +
                "Please provide the restaurant name/contact details, your meal details, and your exact delivery location in a single message.\n\n" +
                "↩️ _Reply with *0* to return to the Main Menu._"
            );
        } else if (text === '2') {
            userStates.set(sender, 'PARCEL_MENU');
            await msg.reply(
                "📦 *Parcel Dispatch*\n\n" +
                "Would you like to send an item or receive an item?\n" +
                "Reply with the number:\n" +
                "*1.* Send a Parcel 📤\n" +
                "*2.* Receive a Parcel 📥\n\n" +
                "↩️ _Reply with *0* to return to the Main Menu._"
            );
        } else if (text === '3') {
            await msg.reply(
                "🏃‍♂️ *Urgent Errand*\n" +
                "*COMING SOON*.\n\n" +
                "↩️ _Reply with *0* to return to the Main Menu._"
            );
        } else if (text === '4') {
            userStates.set(sender, 'FILLING_VENDOR');
            await msg.reply(
                "🏪 *Quicka for Campus Vendors*\n\n" +
                "Let's get your customer's package dispatched! Please reply with the following details in a single message:\n\n" +
                "📍 *Vendor Location:* (Where our rider is picking it up)\n" +
                "📞 *Recipient Phone:* (The customer's contact number)\n" +
                "🏠 *Delivery Location:* (The customer's hostel, faculty, or landmark)\n\n" +
                "↩️ _Reply with *0* to return to the Main Menu._"
            );
        }
    } else if (currentState === 'PARCEL_MENU') {
        if (text === '1') {
            userStates.set(sender, 'FILLING_SEND');
            await msg.reply(
                "📤 *Send a Parcel*\n\n" +
                "Please reply with:\n" +
                "1. Your pickup location/hostel\n" +
                "2. The recipient's name & phone number\n" +
                "3. The delivery location on campus\n" +
                "↩️ _Reply with *0* to return to the Main Menu._"
            );
        } else if (text === '2') {
            userStates.set(sender, 'FILLING_RECEIVE');
            await msg.reply(
                "📥 *Receive a Parcel*\n\n" +
                "Please reply with:\n" +
                "1. Where the courier should pick it up (e.g., Campus Gate, Park, Faculty)\n" +
                "2. Your exact hostel or current location for delivery\n" +
                "↩️ _Reply with *0* to return to the Main Menu._"
            );
        }
    }
});

client.initialize();