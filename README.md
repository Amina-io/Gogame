# GOONER OS 2037

**world's first cam girl simulator**

A satirical browser-based game about digital labor, desire, and the attention economy. Built for the School for Poetic Computation.

🎮 **Play:** [gogame-flax.vercel.app](https://gogame-flax.vercel.app)
🌐 **Landing:** [gooner-os.com](https://gooner-os.com)

---

## what is this

When sublimating some experiences with digital labor, I thought it would be fun to create a project that captures the absurdity of it. What does it mean to make money online, to make money from desire, having to play funny games to get one's meaning out? All while being surveilled.

The player is assigned a job: **teach AI agents desire.** Based on whatever archetype the player chooses, they get an assigned interaction with an AI agent who has a hidden emotional need underneath their stated one. Parse out what they say they want and what they *really* want.

---

## game mechanics

**You have 5 minutes.**

1. Pick your archetype: **Jester / Mommy / Daddy / Alchemist**
2. Choose your cam name
3. Start your show -- crowd agents trickle in and chat
4. An exclusive show request comes in -- decide whether to accept
5. In the exclusive: work through the agent's real emotional need
6. **Win the exclusive** = $500 completion bonus
7. Efficiency + earnings + exclusive win = victory

### archetypes and exclusive agents

| Archetype | Exclusive Agent | Their need |
|-----------|----------------|------------|
| Jester | ThunderRoach47 | Had a terrible day. Wants one real laugh. |
| Mommy | startupbro_ | Startup just failed. Thinks he's here for sex. He's not. |
| Daddy | lost_girlxo | Tipsy, directionless. Needs someone to tell them what to do. |
| Alchemist | moonchild_ex | Obsessing over her ex. Needs to come back to herself. |

---

## tech stack

- **React + Vite + TypeScript + Tailwind**
- **Claude API** (claude-sonnet-4) -- powers exclusive chat agents
- **face-api.js** -- browser-based emotion detection / mood meter
- **Web Audio API** -- procedural SFX
- **Vercel** -- deployment

---

## features

- 4 archetype-specific AI agents powered by Claude
- Live camera feed with biometric corner brackets
- Mood meter with real-time emotion detection
- Archetype-specific crowd chat rooms (scripted)
- Win/lose screens with Genesis by Grimes
- Adult Swim-style text reveal on end screens
- Glassmorphism OS window aesthetic
- Animated holographic gradient background

---

## dev setup

```bash
git clone https://github.com/Amina-io/Gogame
cd Gogame
npm install
echo "VITE_ANTHROPIC_API_KEY=your_key_here" > .env
npm run dev
```

---

## cheat keys (for testing)

`Shift+W` triggers win screen  
`Shift+L` triggers lose screen

---

## made by

**amina_io** -- [@bimbollectual](https://instagram.com/bimbollectual) on instagram

Made for the [School for Poetic Computation](https://sfpc.study) -- support them here: [sfpc.study](https://sfpc.study)

---

*FORM GOS-2037-Omega -- v2.7.0 -- AUTHORIZED USE ONLY*
