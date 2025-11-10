import React, { useEffect, useState } from "react";
import { getSpeakers } from "../api.js";
import SpeakerCard from "../components/SpeakerCard.jsx";

export default function Home(){
  const [speakers, setSpeakers] = useState([]);

  useEffect(()=>{ getSpeakers().then(setSpeakers); },[]);

  return (
    <>
      <h1>Wähle einen Speaker</h1>
      <div className="grid">
        {speakers.map(s => <SpeakerCard key={s.slug} s={s} />)}
      </div>
    </>
  );
}
