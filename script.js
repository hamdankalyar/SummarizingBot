
document.getElementById('file-upload').addEventListener('change', async function (event) {
    const file = event.target.files[0];
    const fileNameDisplay = document.getElementById('file-name');
    const removeFileButton = document.getElementById('remove-file');

    if (!file) {
        return;
    }

    fileNameDisplay.textContent = file.name;
    removeFileButton.style.display = 'inline-block';

    if (file.type === 'application/pdf') {
        // Handle PDF file using PDF.js
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            text += pageText + '\n';
        }

        console.log(text.trim());
        localStorage.setItem('uploadedText', text.trim());
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        // Handle DOCX file using Mammoth.js
        const reader = new FileReader();
        reader.onload = function (event) {
            mammoth.extractRawText({ arrayBuffer: event.target.result })
                .then(function (result) {
                    console.log(result.value);
                    localStorage.setItem('uploadedText', result.value);
                })
                .catch(function (err) {
                    console.error(err);
                });
        };
        reader.readAsArrayBuffer(file);
    } else {
        console.log("Invalid file type");
    }
});

// Task 2: Disable upload if text is entered and vice versa
const textInput = document.getElementById('text-input');
const fileUpload = document.getElementById('file-upload');
const fileNameDisplay = document.getElementById('file-name');
const removeFileButton = document.getElementById('remove-file');

textInput.addEventListener('input', function () {
    if (textInput.value.trim() !== '') {
        fileUpload.disabled = true;
        removeFileButton.style.display = 'none';
        localStorage.setItem('uploadedText', textInput.value.trim());
    } else {
        fileUpload.disabled = false;
    }
});

fileUpload.addEventListener('change', function () {
    if (fileUpload.files.length > 0) {
        textInput.disabled = true;
    } else {
        textInput.disabled = false;
    }
});

removeFileButton.addEventListener('click', function () {
    fileUpload.value = ''; // Clear the file input
    fileNameDisplay.textContent = 'Drop any document here to get started';
    removeFileButton.style.display = 'none';
    textInput.disabled = false; // Enable text input
});



// ==================================================== summary ====================================================

const openaiApiKey = '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';
const uploadText = localStorage.getItem('uploadedText'); // Get the text from local storage
const cachedResponses = {}; // Object to store responses


async function callOpenAiApi(prompt, loaderId) {
    let final = [{
        role: "user",
        content: prompt
    }]
    try {
        document.getElementById(loaderId).style.display = 'block'; // Show loader
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // or other model you prefer
                messages: final,
                max_tokens: 100, // Adjust based on your needs
                temperature: 0.7
            })
        });

        const data = await response.json();

        return data.choices[0].message.content;

    } catch (error) {
        console.error('Error calling OpenAI API:', error);
        return 'Error retrieving summary';
    } finally {
        document.getElementById(loaderId).style.display = 'none'; // Hide loader
    }
}

// Function to handle the summarize button click
document.getElementById('summarize-button').addEventListener('click', async function () {
    document.getElementById('upload-container').style.display = 'none';
    document.getElementById('summary-container').style.display = 'block';
    document.getElementById('new-summary-text').style.display = 'block'; // Show "Write a new summary" text
    const prompt = `Summarize the following text in bullet points:\n\n${uploadText}`;
    const response = await callOpenAiApi(prompt, 'loader-bullet-points');
    document.getElementById('bullet-points').querySelector('p').innerHTML = response.replace(/\n/g, '<br>');

    cachedResponses['bullet-points'] = document.getElementById('bullet-points').querySelector('p').innerHTML; // Cache the response
});



// Function to handle tab switching and lazy load API responses
function openTab(evt, tabName) {
    var i, tabcontent, tabbuttons;

    // Hide all tab content
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Remove "active" class from all tab buttons
    tabbuttons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabbuttons.length; i++) {
        tabbuttons[i].className = tabbuttons[i].className.replace(" active", "");
    }

    // Show the current tab content and add "active" class to the clicked button
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";

    // Check if we already have a cached response for this tab
    if (cachedResponses[tabName]) {
        document.getElementById(tabName).querySelector('p').innerHTML = cachedResponses[tabName];
    } else {
        let prompt;
        let loaderId = `loader-${tabName}`;
        switch (tabName) {
            case 'custom-summary':
                prompt = `Create a custom summary of the following text:\n\n${uploadText}`;
                break;
            case 'tldr':
                prompt = `Summarize the following text in a TL;DR format:\n\n${uploadText}`;
                break;
            case 'detailed':
                prompt = `Provide a detailed summary of the following text:\n\n${uploadText}`;
                break;
        }

        // Only make the API call if the prompt is defined (i.e., not the bullet points tab)
        if (prompt) {
            callOpenAiApi(prompt, loaderId).then(response => {
                document.getElementById(tabName).querySelector('p').innerHTML = response.replace(/\n/g, '<br>');
                cachedResponses[tabName] = document.getElementById(tabName).querySelector('p').innerHTML; // Cache the response
            });
        }
    }
}

// --------------------------- action buttons functions 
// Function to copy the text from the specified tab
function copyText(tabId) {
    const tabContent = document.getElementById(tabId).querySelector(' p').innerText;
    navigator.clipboard.writeText(tabContent).then(() => {
        alert('Text copied to clipboard');
    }).catch(err => {
        console.error('Error copying text: ', err);
    });
}

// Function to download the text from the specified tab
function downloadText(tabId, filename) {
    const tabContent = document.getElementById(tabId).querySelector(' p').innerText;
    const blob = new Blob([tabContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href); // Clean up the URL object after download
}





// Function to reset everything when "Write a new summary" is clicked
document.getElementById('new-summary-text').addEventListener('click', function () {
    // Clear all p tag contents in the tabs
    const tabs = ['bullet-points', 'custom-summary', 'tldr', 'detailed'];
    tabs.forEach(tab => {
        document.getElementById(tab).querySelector('p').innerHTML = '';
    });

    // Reset localStorage
    localStorage.removeItem('uploadedText');

    // Hide summary container and "New Summary" text
    document.getElementById('summary-container').style.display = 'none';
    document.getElementById('new-summary-text').style.display = 'none';

    // Show the upload container
    document.getElementById('upload-container').style.display = 'block';

    // Reset the upload file input and textarea
    document.getElementById('file-upload').value = '';
    document.getElementById('text-input').value = '';

    // Clear cached responses
    for (let key in cachedResponses) {
        if (cachedResponses.hasOwnProperty(key)) {
            delete cachedResponses[key];
        }
    }
});