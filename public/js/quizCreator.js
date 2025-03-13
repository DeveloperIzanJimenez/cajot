// quizCreator.js
const socket = io();
let questionNum = 1; // The first question is already present

/**
 * Sends quiz data (questions, title, and optional PDF) to the server.
 */
function updateDatabase() {
  const questions = [];
  const name = document.getElementById('name').value;
  
  for (let i = 1; i <= questionNum; i++) {
    const question = document.getElementById(`q${i}`).value;
    const answers = [
      document.getElementById(`${i}a1`).value,
      document.getElementById(`${i}a2`).value,
      document.getElementById(`${i}a3`).value,
      document.getElementById(`${i}a4`).value,
    ];
    const correct = document.getElementById(`correct${i}`).value;
    questions.push({ question, answers, correct });
  }
  
  const quiz = { id: 0, name, questions };
  const pdfInput = document.getElementById('pdfFile');
  const pdfFile = pdfInput?.files[0];
  
  const formData = new FormData();
  formData.append('quizData', JSON.stringify(quiz));
  if (pdfFile) {
    formData.append('pdfFile', pdfFile);
  }
  
  fetch('/uploadQuiz', {
    method: 'POST',
    body: formData
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log("Quiz created:", data.quiz);
      socket.emit('newQuizCreated', data.quiz);
    } else {
      console.error("Error creating quiz:", data.error);
    }
  })
  .catch(err => console.error(err));
}

/**
 * Adds a new question block to the quiz creation form.
 */
function addQuestion() {
  questionNum++;
  const questionsDiv = document.getElementById('allQuestions');
  if (!questionsDiv) {
    console.error("Element with id 'allQuestions' not found.");
    return;
  }
  
  // Create a container for the new question
  const newQuestionDiv = document.createElement("div");
  newQuestionDiv.id = 'question-field'; // Consider appending questionNum for a unique id if needed

  // Helper function to create label and input elements
  const createField = (labelText, inputId, inputType = 'text') => {
    const label = document.createElement('label');
    label.innerHTML = labelText;
    const input = document.createElement('input');
    input.type = inputType;
    input.id = inputId;
    return { label, input };
  };

  // Create question and answer fields using the helper
  const { label: questionLabel, input: questionField } = createField(`Question ${questionNum}: `, `q${questionNum}`);
  const { label: answer1Label, input: answer1Field } = createField("Answer 1: ", `${questionNum}a1`);
  const { label: answer2Label, input: answer2Field } = createField("Answer 2: ", `${questionNum}a2`);
  const { label: answer3Label, input: answer3Field } = createField("Answer 3: ", `${questionNum}a3`);
  const { label: answer4Label, input: answer4Field } = createField("Answer 4: ", `${questionNum}a4`);
  const { label: correctLabel, input: correctField } = createField("Correct Answer (1-4): ", `correct${questionNum}`, 'number');
  
  // Append all created fields to the new question div with line breaks for spacing
  newQuestionDiv.appendChild(questionLabel);
  newQuestionDiv.appendChild(questionField);
  newQuestionDiv.appendChild(document.createElement('br'));
  newQuestionDiv.appendChild(document.createElement('br'));

  newQuestionDiv.appendChild(answer1Label);
  newQuestionDiv.appendChild(answer1Field);
  newQuestionDiv.appendChild(answer2Label);
  newQuestionDiv.appendChild(answer2Field);
  newQuestionDiv.appendChild(document.createElement('br'));
  newQuestionDiv.appendChild(document.createElement('br'));

  newQuestionDiv.appendChild(answer3Label);
  newQuestionDiv.appendChild(answer3Field);
  newQuestionDiv.appendChild(answer4Label);
  newQuestionDiv.appendChild(answer4Field);
  newQuestionDiv.appendChild(document.createElement('br'));
  newQuestionDiv.appendChild(document.createElement('br'));

  newQuestionDiv.appendChild(correctLabel);
  newQuestionDiv.appendChild(correctField);
  
  // Append new question to the main container and add spacing
  questionsDiv.appendChild(document.createElement('br'));
  questionsDiv.appendChild(newQuestionDiv);
  
  // Set a random background color for visual differentiation
  newQuestionDiv.style.backgroundColor = randomColor();
}

/**
 * Cancels the quiz creation, asking for user confirmation before redirecting.
 */
function cancelQuiz() {
  if (confirm("Are you sure you want to exit? All work will be DELETED!")) {
    window.location.href = "../";
  }
}

/**
 * Listens for the 'startGameFromCreator' event and redirects to the host page.
 */
socket.on('startGameFromCreator', (data) => {
  window.location.href = `../../host/?id=${data}`;
});

/**
 * Returns a random color from a predefined set.
 * @returns {string} A hex color code.
 */
function randomColor() {
  const colors = ['#4CAF50', '#f94a1e', '#3399ff', '#ff9933'];
  const randomNum = Math.floor(Math.random() * colors.length);
  return colors[randomNum];
}

/**
 * Sets a random background color on the first question block when the page loads.
 */
function setBGColor() {
  const randColor = randomColor();
  const questionField = document.getElementById('question-field');
  if (questionField) {
    questionField.style.backgroundColor = randColor;
  }
}

document.addEventListener("DOMContentLoaded", setBGColor);
