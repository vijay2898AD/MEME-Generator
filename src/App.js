import React, { useState, useRef, useEffect } from 'react';
import './App.css';

const MemeGenerator = () => {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [topTextPos, setTopTextPos] = useState({ x: 0, y: 0 });
  const [bottomTextPos, setBottomTextPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedText, setDraggedText] = useState(null);
  const [fontSize, setFontSize] = useState(72);
  const [rawFontSize, setRawFontSize] = useState(String(fontSize));
  const canvasRef = useRef(null);

  // Function to handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setUploadedImage(img);
        // We no longer need to set position here.
        // It will be handled in the useEffect hook.
      };
      img.src = event.target.result;
    };
    if (file) {
      reader.readAsDataURL(file);
    }
  };

  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;

      if (testWidth > maxWidth && i > 0) {
        lines.push({ text: line, x: x, y: y });
        line = words[i] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    lines.push({ text: line, x: x, y: y });
    return lines;
  };

  const getMultilineTextMetrics = (lines, ctx, fontSize) => {
    const fontHeight = fontSize;
    if (lines.length === 0) {
        return { left: 0, right: 0, top: 0, bottom: 0 };
    }

    // Get the bounding box of the first line
    const firstLineMetrics = ctx.measureText(lines[0].text);
    let minX = lines[0].x - firstLineMetrics.width / 2;
    let maxX = lines[0].x + firstLineMetrics.width / 2;
    let minY = lines[0].y;
    let maxY = lines[0].y;

    // Iterate through the rest of the lines to find the total bounding box
    for (let i = 1; i < lines.length; i++) {
        const lineMetrics = ctx.measureText(lines[i].text);
        const currentMinX = lines[i].x - lineMetrics.width / 2;
        const currentMaxX = lines[i].x + lineMetrics.width / 2;

        minX = Math.min(minX, currentMinX);
        maxX = Math.max(maxX, currentMaxX);
        maxY = lines[i].y; // Update maxY to the y of the last line
    }

    return {
        left: minX,
        right: maxX,
        top: minY - fontHeight,
        bottom: maxY + fontHeight / 2,
    };
};

  // The main effect hook for drawing and initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const maxWidth = canvas.width - 20;
    const lineHeight = fontSize + 10;
    const numberValue = Number(rawFontSize);
    const minSize = 25;
    const maxSize = 65;

    if (uploadedImage) {
      // Set canvas dimensions to match the image
      canvas.width = 600;
      canvas.height = 400;

      const ratio = Math.min(canvas.width / uploadedImage.width, canvas.height / uploadedImage.height);
      const newWidth = uploadedImage.width * ratio;
      const newHeight = uploadedImage.height * ratio;
      const x = (canvas.width - newWidth) / 2;
      const y = (canvas.height - newHeight) / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw the image
       ctx.drawImage(uploadedImage, 0, 0, uploadedImage.width, uploadedImage.height, x, y, newWidth, newHeight);

      if (rawFontSize === '' || isNaN(numberValue)) {
          return;
        }

        if (numberValue < minSize) {
            setFontSize(minSize);
        } else if (numberValue > maxSize) {
            setFontSize(maxSize);
        } else {
            setFontSize(numberValue);
        }

      // Check for a fresh image load to reset positions
      if (topTextPos.x === 0 && topTextPos.y === 0) {
        setTopTextPos({ x: canvas.width / 2, y: 50 });
        setBottomTextPos({ x: canvas.width / 2, y: canvas.height - 50 });
      }

      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.font = `${fontSize}px Impact`;
      ctx.textAlign = 'center';

      // Call the updated wrapText function
      const topLines = wrapText(ctx, topText.toUpperCase(), topTextPos.x, topTextPos.y, maxWidth, lineHeight);
      const bottomLines = wrapText(ctx, bottomText.toUpperCase(), bottomTextPos.x, bottomTextPos.y, maxWidth, lineHeight);

      // Draw each line from the returned arrays
      topLines.forEach(line => {
          ctx.fillText(line.text, line.x, line.y);
          ctx.strokeText(line.text, line.x, line.y);
      });

      bottomLines.forEach(line => {
          ctx.fillText(line.text, line.x, line.y);
          ctx.strokeText(line.text, line.x, line.y);
      });
    }
  }, [uploadedImage, topText, bottomText, topTextPos, bottomTextPos, fontSize,rawFontSize]);

  // Mouse event handlers
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px Impact`;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const topLines = wrapText(ctx, topText.toUpperCase(), topTextPos.x, topTextPos.y, canvas.width - 20, fontSize + 10);
    const bottomLines = wrapText(ctx, bottomText.toUpperCase(), bottomTextPos.x, bottomTextPos.y, canvas.width - 20, fontSize + 10);
    const topMetrics = getMultilineTextMetrics(topLines, ctx,fontSize);
    const bottomMetrics = getMultilineTextMetrics(bottomLines, ctx, fontSize);


    if (isPointInText(mouseX, mouseY, topMetrics)) {
      console.log('Clicked on top text!');
      setIsDragging(true);
      setDraggedText('top');
    } else if (isPointInText(mouseX, mouseY, bottomMetrics)) {
      console.log('Clicked on bottom text!');
      setIsDragging(true);
      setDraggedText('bottom');
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (draggedText === 'top') {
      setTopTextPos({ x: mouseX, y: mouseY });
    } else if (draggedText === 'bottom') {
      setBottomTextPos({ x: mouseX, y: mouseY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedText(null);
  };

  const isPointInText = (x, y, metrics) => {
    return (
      x >= metrics.left &&
      x <= metrics.right &&
      y >= metrics.top &&
      y <= metrics.bottom
    );
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'my-meme.png';
      link.href = image;
      link.click();
    }
  };

  return (
  <>
    <h1 className="app-title">Meme Generator</h1>
    <p className="app-description">This meme generator is a powerful front-end application built with React and the HTML Canvas API. It allows for dynamic text manipulation, including multi-line support and real-time drag-and-drop functionality. All image processing and text rendering are handled directly in your browser, ensuring a fast and private user experience.</p>
    <div className="meme-app-container">
      <div className="sidebar">  
        <div className="controls">
          <input type="file" onChange={handleImageUpload} accept="image/*" />
          <input
            type="text"
            placeholder="Top Text"
            value={topText}
            onChange={(e) => setTopText(e.target.value)}
          />
          <input
            type="text"
            placeholder="Bottom Text"
            value={bottomText}
            onChange={(e) => setBottomText(e.target.value)}
          />
          <label htmlFor="fontSize">Font Size:</label>
          <input
            type="number"
            id="fontSize"
            value={rawFontSize}
            onChange={(e) => setRawFontSize(e.target.value)}
            min="25"
            max ="150"
          />
          <button onClick={handleDownload}>Download Meme</button>
        </div>
      </div>

      <div className="main-content">
        <div className="canvas-wrapper">
          <canvas 
            ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
          />
        </div>
      </div>
    </div>
    <br></br>
    <br></br>
    <div className="footer">
    <h3>What is the Meme Generator?</h3>
    <p>The Meme Generator is a free online tool that allows you to create custom memes by adding text to images. You can upload your own images, add top and bottom text, adjust the font size, and drag the text to position it anywhere on the image. Once you're satisfied with your creation, you can download the meme as a PNG file.</p>
    <h3>How to Use the Meme Generator :</h3>
    <ol>
      <li>Click on the "Choose File" button to upload an image from your device.</li>
      <li>Enter the text you want to appear at the top and bottom of the image in the respective input fields.</li>
      <li>Adjust the font size using the font size input field. The font size can be set between 25 and 150 pixels.</li>
      <li>Click and drag the text on the canvas to reposition it as desired.</li>
      <li>Once you're happy with your meme, click the "Download Meme" button to save it as a PNG file.</li>
    </ol>
    <h3>Features</h3>
    <ul>
      <li>Upload any image from your device.</li>
      <li>Add customizable top and bottom text.</li>
      <li>Adjust font size for better visibility.</li>
      <li>Drag and position text anywhere on the image.</li>
      <li>Download your meme as a high-quality PNG file.</li>
    </ul>
    <h2>Start creating your memes now and share them with your friends!</h2>
    </div>
  </>
  );
};

export default MemeGenerator;