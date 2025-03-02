import React from 'react';

/**
 * PlayerStatus component to display the status of players.
 * @param {Object} props - The component props.
 * @param {Array} props.players - The list of players.
 * @param {Object} props.responseStatus - The response status of players.
 * @returns {JSX.Element} The PlayerStatus component.
 */
const PlayerStatus = ({ players = [], responseStatus = {} }) => {
  if (!Array.isArray(players) || players.length === 0) {
    return <p>Waiting for players...</p>;
  }

  return (
    <div className="player-status">
      <h3>Player Status</h3>
      <ul>
        {players.map(player => {
          const handle = player.githubHandle || player.id;
          return (
            <li key={handle}>
              {handle}: {responseStatus[handle] ? 'Answered' : 'Waiting'}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PlayerStatus;
