import React from 'react';

/**
 * ResponseStatus component to display the response status of players.
 * @param {Object} props - The component props.
 * @param {Array} props.players - The list of players.
 * @param {Object} props.responseStatus - The response status of players.
 * @returns {JSX.Element} The ResponseStatus component.
 */
const ResponseStatus = ({ players = [], responseStatus = {} }) => {
  if (!Array.isArray(players) || players.length === 0) {
    return null;
  }

  const totalPlayers = players.length;
  const respondedPlayers = players.filter(player => 
    responseStatus[player.githubHandle || player.id]
  ).length;

  return (
    <div className="response-status">
      <h3>Responses</h3>
      <p>{respondedPlayers} out of {totalPlayers} players have answered</p>
    </div>
  );
};

export default ResponseStatus;
