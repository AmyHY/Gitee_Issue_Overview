const express = require("express");
const bodyParser = require("body-parser");
const fetch = require('isomorphic-fetch');
const fs = require('fs');
const app = express();
const path = require('path');

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint for token exchange
const tokenEndpoint = 'https://gitee.com/oauth/token';
let accessToken;

app.get('/table', (req, res) => {
  const authorizationCode = req.query.code; // Get the authorization code from the query parameter

  if (!authorizationCode) {
    return res.status(400).send('Missing authorization code');
  }

  const clientId = '49a704af8b43f2d14093b887f25b9c2fcc0c4e4a9e0e143865499aa12ebe0f3a';
  const clientSecret = 'e9998fb3c5f2c3cd7efd3e740fbaad79800bea1b8abeb0c177bca04d0e2b7fbc';
  const redirectUri = 'http://localhost:3000/table'; // Update the redirect URI here

  const requestBody = new URLSearchParams();
  requestBody.append('grant_type', 'authorization_code');
  requestBody.append('code', authorizationCode);
  requestBody.append('client_id', clientId);
  requestBody.append('client_secret', clientSecret);
  requestBody.append('redirect_uri', redirectUri);

  fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody,
  })
  .then(response => {
    console.log('Token Exchange Response:', response.status, response.statusText);
    if (!response.ok) {
      throw new Error(`Failed to exchange token. Status: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    // The response will contain the access token
    accessToken = data.access_token;

    const owner = 'PunctureRobotics';
    const repo = 'test2';
    const issuesEndpoint = `https://gitee.com/api/v5/repos/${owner}/${repo}/issues?state=all`;

    fetch(issuesEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `token ${accessToken}`,
      },
    })
    .then(response => {
      console.log('Issues API Response:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`Failed to retrieve issues. Status: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      // Filter the issues for assignee "AMY" and their issue states
      const filteredIssues = data.filter(issue => issue.assignee && issue.assignee.name === '何樾');
      console.log("authorizationCode = " + authorizationCode);
      console.log('Number of issues found for assignee "AMY" = ' + filteredIssues.length); //debugging

      // Store the length of filteredIssues in a variable
      const filteredIssuesCount = filteredIssues.length;

      // Render the "index.html" template passing the filteredIssuesCount
      //res.render('index', { filteredIssuesCount });
      //res.sendFile(path.join(__dirname, 'index.html'), { filteredIssuesCount }); // Send the "index.html" file directly
      
      // Process the data to get the counts of each issue state
      const issueStates = filteredIssues.map(issue => issue.state);
      const stateCounts = issueStates.reduce((countMap, state) => {
        countMap[state] = (countMap[state] || 0) + 1;
        return countMap;
      }, {});

      // Get the assignee name (assuming it's the same for all filtered issues)
      const assigneeName = filteredIssues.length > 0 ? filteredIssues[0].assignee.name : '';


      // Write the filtered issues data to a new JSON file named "issues_data.json"
      const jsonData = JSON.stringify(filteredIssues, null, 2);
      fs.writeFile('issues_data.json', jsonData, 'utf8', (err) => {
        if (err) {
          console.error('Error writing to file:', err);
        } else {
          console.log('Data written to issues_data.json successfully!');
        }
      });

      // Render the "table.ejs" template with issues data
      res.render('table', { stateCounts, assigneeName, filteredIssuesCount});
    })
    .catch(error => {
      console.error('Error during issue retrieval:', error);
      // Handle the error and send an appropriate response to the client
      res.status(500).send('Error during issue retrieval');
    });
  })
  .catch(error => {
    console.error('Error during token exchange:', error);
  });
});

app.listen(3000, function () {
  console.log("Server is running on port http://localhost:3000.");
});
