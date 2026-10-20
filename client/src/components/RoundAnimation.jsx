import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShieldAlert, Trophy } from 'lucide-react';
import HandFigure from './HandFigure.jsx';

export default function RoundAnimation({ result, matchState, userId }) {
  const [phase, setPhase] = useState('bump');

  useEffect(() => {
    setPhase('bump');
    const timer = setTimeout(() => setPhase('reveal'), 430);
    return () => clearTimeout(timer);
  }, [result?.roundId]);

  if (!result) return null;
  const batter = matchState?.players.find((player) => player.id === result.batterId);
  const bowler = matchState?.players.find((player) => player.id === result.bowlerId);
  const userBatted = userId === result.batterId;
  const leftPlayer = userBatted ? batter : bowler;
  const rightPlayer = userBatted ? bowler : batter;
  const leftNumber = userBatted ? result.batterMove : result.bowlerMove;
  const rightNumber = userBatted ? result.bowlerMove : result.batterMove;
  const leftIsBatter = userBatted;
  const rightIsBatter = !userBatted;
  const isWicket = result.wicket;

  return (
    <AnimatePresence>
      <motion.section className={`round-reveal ${isWicket ? 'round-wicket' : 'round-runs'}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
        <div className="reveal-topline"><span>ROUND {result.roundNumber}</span><span><Sparkles size={14} /> SIMULTANEOUS REVEAL</span></div>
        <div className={`hands-stage ${phase === 'bump' ? 'phase-bump' : 'phase-reveal'}`}>
          <motion.div className="reveal-player left" initial={{ x: -65 }} animate={{ x: phase === 'bump' ? 14 : 0, rotate: phase === 'bump' ? 6 : 0 }} transition={{ type: 'spring', stiffness: 250, damping: 16 }}>
            <span className="reveal-player-name">{leftPlayer?.name ?? 'Player 1'}{leftIsBatter ? ' · BAT' : ' · BOWL'}</span>
            <HandFigure number={leftNumber} fist={phase === 'bump'} side="left" size={132} />
            <AnimatePresence>{phase === 'reveal' && <motion.strong className="finger-number" initial={{ opacity: 0, y: 9, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring' }}>{leftNumber}</motion.strong>}</AnimatePresence>
          </motion.div>
          <motion.div className="bump-flash" initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: phase === 'bump' ? 1 : 0, scale: phase === 'bump' ? 1.2 : 0.3 }} transition={{ duration: 0.22 }}><Sparkles size={25} /></motion.div>
          <motion.div className="reveal-player right" initial={{ x: 65 }} animate={{ x: phase === 'bump' ? -14 : 0, rotate: phase === 'bump' ? -6 : 0 }} transition={{ type: 'spring', stiffness: 250, damping: 16 }}>
            <span className="reveal-player-name">{rightPlayer?.name ?? 'Player 2'}{rightIsBatter ? ' · BAT' : ' · BOWL'}</span>
            <HandFigure number={rightNumber} fist={phase === 'bump'} side="right" size={132} />
            <AnimatePresence>{phase === 'reveal' && <motion.strong className="finger-number" initial={{ opacity: 0, y: 9, scale: 0.6 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring' }}>{rightNumber}</motion.strong>}</AnimatePresence>
          </motion.div>
        </div>
        {phase === 'reveal' && (
          <motion.div className="round-outcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {isWicket ? <ShieldAlert size={22} /> : <Trophy size={22} />}
            <div>
              <strong>{isWicket ? 'WICKET!' : `+${result.runs} RUN${result.runs === 1 ? '' : 'S'}`}</strong>
              <span>{isWicket ? 'Both players showed the same number.' : `${batter?.name ?? 'The batsman'} scored ${result.runs}.`}</span>
              {result.autoSelected?.includes(userId) && <em>Your move timed out; a random number was selected.</em>}
              {result.autoSelected?.some((id) => id !== userId) && <em>An opponent timed out; a random number was selected.</em>}
            </div>
          </motion.div>
        )}
      </motion.section>
    </AnimatePresence>
  );
}
