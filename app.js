const express = require("express");
const bodyParser = require("body-parser");
const fetch = require('isomorphic-fetch');
const fs = require('fs');
const app = express();
const path = require('path');
const session = require('express-session'); //to store access-token

// Make the issues a global variable for filtering convenience.
global_issues_data = {};
const port = 3000; // 443 for HTTPS, 80 for HTTP

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());

app.use(session({
  secret: 'test-secret-key',
  resave: false,
  saveUninitialized: true,
}));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Endpoint for token exchange
const tokenEndpoint = 'https://gitee.com/oauth/token';
let accessToken;

app.get('/table', async (req, res) => {
  if (req.query.code) {
    authorizationCode = req.query.code; // Get the authorization code from the query parameter
    req.session.authorizationCode = authorizationCode;
  } else if (req.session.authorizationCode) {
    authorizationCode = req.session.authorizationCode; // Get the authorization code from saved session
  } else {
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
    console.log();
    if (!response.ok) {
      throw new Error(`Failed to exchange token. Status: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    // The response will contain the access token
    accessToken = data.access_token;
    req.session.accessToken = data.access_token;

    const enterprise = 'PunctureRobotics';
    const issuesEndpoint = `https://gitee.com/api/v5/enterprises/${enterprise}/issues?state=all`;

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
      global_issues_data = data;
      res.render('table', { data: global_issues_data });
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

// Function to fetch unique assignee names from data
async function fetchUniqueAssigneeNames(data) {
  const uniqueAssigneeNames = Array.from(new Set(data.map(issue => issue.user.name)));
  return uniqueAssigneeNames;
}
// Function to process assignee data
async function processAssigneeData(assigneeName, data) {
  const filteredIssues = data.filter(issue => issue.user.name === assigneeName);

  const filteredIssues_priority = filteredIssues.filter(issue => issue.priority === 3 || issue.priority === 4);
  const issueTitles_priority = filteredIssues_priority.map(issue => issue.title);
  
  const issueTitles_all = filteredIssues.map(issue => issue.title);
  const issueTitles_progress = filteredIssues.map(issue => issue.issue_state);

  // Other processing and data calculations if needed

  return {
    assigneeName,
    stateCounts: calculateStateCounts(filteredIssues),
    filteredIssuesCount: filteredIssues.length,
    issueTitles_priority,
    issueTitles_all,
    issueTitles_progress
  };
}
// Function to calculate state counts
function calculateStateCounts(issues) {
  const issueStates = issues.map(issue => issue.issue_state);
  return issueStates.reduce((countMap, state) => {
    countMap[state] = (countMap[state] || 0) + 1;
    return countMap;
  }, {});
}

app.post('/filter', (req, res) => {  
  const { program, milestone, user, deadline} = req.body;

  // Perform filtering based on selected criteria
  const filteredData = global_issues_data.filter((issue) => {
    const userMatch = user === 'all' || issue.user.name === user;
    const milestoneMatch = milestone === 'all' || issue.milestone === milestone;
    const programMatch = program === 'all' || (issue.program && issue.program.name === program);
    const deadlineMatch = deadline === 'all' || issue.deadline === deadline; 
    return userMatch && milestoneMatch && programMatch && deadlineMatch;
  });
  
  res.json(filteredData);
});













app.get('/pie_chart_page', (req, res) => {
  const assigneeName = req.query.assigneeName;
  const stateCounts = JSON.parse(decodeURIComponent(req.query.stateCounts));
  const issueTitles_all = JSON.parse(decodeURIComponent(req.query.issueTitles_all));
  const issueTitles_progress = JSON.parse(decodeURIComponent(req.query.issueTitles_progress));
  const stateLabelTranslations = {
    'open': '开启的',
    'progressing': '进行中',
    'closed': '关闭的',
    'rejected': '拒绝的'
  };
  // Render 'pie_chart_page.ejs' passing the assigneeName, stateCounts, and stateLabelTranslations
  res.render('pie_chart_page', { assigneeName, stateCounts, stateLabelTranslations, issueTitles_all, issueTitles_progress });

});






app.get('/create-issue-form', (req, res) => {
  res.render('create_issue_form');
});

app.post('/create-issue', async (req, res) => {
    try {
        const owner = 'PunctureRobotics'; // Update with the correct owner/username
        const accessToken = req.session.accessToken; // Retrieve the access token from the session

        // Prepare the request payload
        const requestData = {
            title: req.body.title, // Required: Title of the issue
            access_token: accessToken,
            body: req.body.body || '', // Optional: Body of the issue
            assignee: req.body.assignee || '', // Optional: Assignee of the issue
            repo: req.body.repo || '', // Optional: Repository name
        };

        // Make the POST request to create a new issue
        const response = await fetch(`https://gitee.com/api/v5/repos/${owner}/issues`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });

        // Check the response status and handle accordingly
        if (!response.ok) {
            throw new Error(`Failed to create issue. Status: ${response.status} ${response.statusText}`);
        }
        console.log('The new issue is successfully created!');

        // Redirect back to the table page or any other appropriate page
        res.redirect('/');
    } catch (error) {
        console.error('Error creating issue:', error);
        // Handle errors and send an appropriate response to the client
        res.status(500).send('Error creating issue');
    }
});


// app.listen(port, hostname, function () {
//   console.log(`Server is running on https://${hostname}:${port}.`);
// });
app.listen(port, () => console.log(`Server is running on port ${port}!`));
