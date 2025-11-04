import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { PUZZLES } from './constants/puzzles';

function App() {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(() => Math.floor(Math.random() * PUZZLES.length));
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [hint, setHint] = useState('');
  const [loadingHint, setLoadingHint] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [isTimeUp, setIsTimeUp] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const currentPuzzle = PUZZLES[currentPuzzleIndex];

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = () => {
    stopTimer();
    setIsTimeUp(false);
    setTimeLeft(20);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          stopTimer();
          setIsTimeUp(true);
          setFeedback(`Time's up! The answer was: "${currentPuzzle.answer}"`);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [currentPuzzleIndex]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isTimeUp) return;

    if (userAnswer.toLowerCase().trim() === currentPuzzle.answer.toLowerCase()) {
      setFeedback('Correct! Well done.');
      setHint('');
      stopTimer();
    } else {
      setFeedback('Incorrect. Try again!');
    }
  };

  const changePuzzle = (direction: 'next' | 'prev') => {
    const totalPuzzles = PUZZLES.length;
    setCurrentPuzzleIndex((prevIndex) => {
      if (direction === 'next') {
        return (prevIndex + 1) % totalPuzzles;
      }
      return (prevIndex - 1 + totalPuzzles) % totalPuzzles;
    });
    resetState();
  };

  const resetState = () => {
    setUserAnswer('');
    setFeedback('');
    setHint('');
  };

  const getHint = async () => {
    if (!process.env.API_KEY) {
      setHint('API key is not set. Please set the API_KEY environment variable.');
      return;
    }
    setLoadingHint(true);
    setHint('');

    try {
      const genAI = new GoogleGenAI({apiKey: process.env.API_KEY});
      const prompt = "What is this image? Give me a hint for this rebus puzzle, but don't give me the answer. The answer is a common phrase.";
      const imagePart = await fileToGenerativePart(currentPuzzle.image);
      const textPart = { text: prompt };
  
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: { parts: [imagePart, textPart] },
      });

      const text = response.text;
      setHint(text);
    } catch (error) {
      console.error("Error getting hint:", error);
      setHint('Sorry, I could not get a hint for you.');
    } finally {
      setLoadingHint(false);
    }
  };

  async function fileToGenerativePart(dataUrl: string) {
    const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
    const base64Data = dataUrl.split(',')[1];
    return {
      inlineData: {
        data: base64Data,
        mimeType
      },
    };
  }

  const isCorrect = feedback.startsWith('Correct');

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl text-center max-w-lg w-full my-8 ring-1 ring-gray-200">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">Rebus Puzzles</h1>
        <p className="text-gray-500 mb-4">Guess the common phrase from the image.</p>
        
        <div className={`text-3xl font-mono font-bold mb-4 ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}>
          Time Left: {timeLeft}s
        </div>
        
        <img 
          key={currentPuzzle.id}
          src={currentPuzzle.image} 
          alt="Rebus Puzzle" 
          className="w-full max-w-sm mx-auto rounded-lg border border-gray-200 shadow-sm mb-6 h-64 object-contain p-2 bg-white" 
        />
        
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder="Your answer"
            aria-label="Your answer for the rebus puzzle"
            disabled={isTimeUp || isCorrect}
            className="flex-grow p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition w-full disabled:bg-gray-100"
          />
          <button 
            type="submit"
            disabled={isTimeUp || isCorrect}
            className="bg-blue-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-600 transition shadow active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </form>
        
        {feedback && <div className={`p-3 rounded-lg mt-4 font-medium ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{feedback}</div>}
        
        <button 
          onClick={getHint} 
          disabled={loadingHint || isTimeUp || isCorrect} 
          className="bg-green-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-600 transition shadow w-full my-4 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loadingHint ? 'Getting hint...' : 'Get a Hint'}
        </button>
        
        {loadingHint && <div className="text-gray-600 mt-4 animate-pulse">Thinking...</div>}
        {hint && <div className="bg-indigo-100 text-indigo-800 p-4 rounded-lg mt-4 text-left">{hint}</div>}

        <div className="flex justify-between mt-6">
          <button 
            onClick={() => changePuzzle('prev')}
            className="bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-600 transition shadow active:scale-95"
            aria-label="Previous puzzle"
          >
            Previous
          </button>
          <button 
            onClick={() => changePuzzle('next')}
            className="bg-gray-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-600 transition shadow active:scale-95"
            aria-label="Next puzzle"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
