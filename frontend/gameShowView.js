import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GameShowView = () => {
  const [question, setQuestion] = useState('');
  const [choices, setChoices] = useState([]);
  const [progress, setProgress] = useState(0);
  const [winner, setWinner] = useState('');
  const [quip, setQuip] = useState('');

  useEffect(() => {
    // Fetch the current question and choices from the backend
    const fetchQuestion = async () => {
      try {
        const response = await axios.get('/api/currentQuestion');
        setQuestion(response.data.question);
        setChoices(response.data.choices);
      } catch (error) {
        console.error('Error fetching question:', error);
      }
    };

    fetchQuestion();
  }, []);

  useEffect(() => {
    // Fetch the progress of responses from the backend
    const fetchProgress = async () => {
      try {
        const response = await axios.get('/api/progress');
        setProgress(response.data.progress);
      } catch (error) {
        console.error('Error fetching progress:', error);
      }
    };

    fetchProgress();
  }, []);

  useEffect(() => {
    // Fetch the winner and quip from the backend
    const fetchWinnerAndQuip = async () => {
      try {
        const response = await axios.get('/api/winnerAndQuip');
        setWinner(response.data.winner);
        setQuip(response.data.quip);
      } catch (error) {
        console.error('Error fetching winner and quip:', error);
      }
    };

    fetchWinnerAndQuip();
  }, [progress]);

  return (
    <div>
      <h2>Current Question</h2>
      <p>{question}</p>
      <ul>
        {choices.map((choice, index) => (
          <li key={index}>{choice}</li>
        ))}
      </ul>
      <h3>Progress</h3>
      <progress value={progress} max="100"></progress>
      {winner && (
        <div>
          <h3>Winner</h3>
          <p>{winner}</p>
          <p>{quip}</p>
        </div>
      )}
    </div>
  );
};

export default GameShowView;
