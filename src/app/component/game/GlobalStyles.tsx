export default function GlobalStyles() {
  return (
    <style jsx global>{`
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=MedievalSharp&display=swap');

      .font-fantasy { font-family: 'Cinzel', serif; }
      .font-rpg { font-family: 'MedievalSharp', cursive; }

      .hide-scrollbar::-webkit-scrollbar { display: none; }
      .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

      .text-shadow { text-shadow: 2px 2px 4px rgba(0,0,0,0.9); }

      .scene { width: 100px; height: 100px; perspective: 600px; }
      .cube {
        width: 100%;
        height: 100%;
        position: relative;
        transform-style: preserve-3d;
        transition: transform 1s ease-out;
      }
      .cube__face {
        position: absolute;
        width: 100px;
        height: 100px;
        background: linear-gradient(135deg, #5e2cb8, #3b1c7a);
        border: 2px solid #a875ff;
        border-radius: 10px;
        font-size: 40px;
        font-weight: bold;
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
      }
      .cube__face--1 { transform: rotateY(0deg) translateZ(50px); }
      .cube__face--2 { transform: rotateY(90deg) translateZ(50px); }
      .cube__face--3 { transform: rotateY(180deg) translateZ(50px); }
      .cube__face--4 { transform: rotateY(-90deg) translateZ(50px); }
      .cube__face--5 { transform: rotateX(90deg) translateZ(50px); }
      .cube__face--6 { transform: rotateX(-90deg) translateZ(50px); }
    `}</style>
  );
}