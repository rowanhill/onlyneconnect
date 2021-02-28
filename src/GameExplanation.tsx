export const GameExplanation = () => {
    return (
        <>
            <h2>The game</h2>
            <p>Onlyne Connect is a totally unofficial version of the BBC's Only Connect with an online pub quiz twist.</p>
            <p>
                Just like in Only Connect there are four types of questions: connections, sequences, walls, and missing vowels.
                Unlike the TV version, all teams can (try to!) answer all the questions, just like in a pub quiz. There are
                also some differences in the way questions are scored, and the missing vowels questions are a little different.
            </p>
            <p>
                During <strong>connection</strong> questions, the quiz master reveals four clues one by one, and teams must
                guess what connects them. The fewer clues revealed when a team makes their guess, the more points they get if
                it's right: 5, 3, 2, or 1 point for correct guesses on the 1st, 2nd, 3rd, and 4th clues respectively.
            </p>
            <p>
                <strong>Sequence</strong> questions are similar, except the clues are in a sequence and teams must guess what
                comes fourth. Only three clues are shown, so only 5, 3, or 2 points are available.
            </p>
            <p>
                <strong>Wall</strong> questions are a 4 x 4 grid of clues. Teams have to sort the wall into four groups and
                then identify what connects each group. Careful, though, once two groups have been found, three wrong answers
                will freeze the wall (so no more guesses). If you don't find all the groups, you'll still have a chance to find
                all the connections. It's one point for each group found, and one point for each correct connection - plus two
                bonus points if you find all the groups and connections (for a maximum of 10 points).
            </p>
            <p>
                <strong>Missing vowels</strong> questions are a little different to the TV version. Four clues are shown
                simultaneously, but all the vowels have been removed, the remaining letters squished together, and spaces
                randomly inserted. Teams must guess the connection between all the clues. The 1st correct answer gets 4 points,
                the 2nd and 3rd get 3 points, the 4th, 5th, and 6th get 2 points, and all remaining correct answers get 1 point.
            </p>
        </>
    );
};