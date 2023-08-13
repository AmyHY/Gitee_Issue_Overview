const express = require("express");
const bodyParser = require("body-parser");
const fetch = require('isomorphic-fetch');
const fs = require('fs');
const app = express();
const path = require('path');
const session = require('express-session'); //to store access-token

// Make the issues a global variable for filtering convenience.
global_issues_data = [];
// Endpoint for token exchange
const tokenEndpoint = 'https://gitee.com/oauth/token';
let accessToken;
//const port = 3000; // 443 for HTTPS, 80 for HTTP

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
app.use(bodyParser.json());

app.use(session({
  secret: 'test-secret-key',
  resave: false,
  saveUninitialized: true,
}));

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});



app.get('/table', async (req, res) => { // handle redirect FROM 'filter_first.ejs'.
  // global_issues_data is filled with issues under a selected program
  res.render('table', {issues_data : global_issues_data});
});





// 初步筛选项目

app.get('/filter_first', (req, res) => {
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
  const redirectUri = 'http://localhost:3000/filter_first'; // Update the redirect URI here

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
    console.log('filter_first: Token Exchange Response:', response.status, response.statusText);
    if (!response.ok) {
      throw new Error(`filter_first: Failed to exchange token. Status: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    // The response will contain the access token
    accessToken = data.access_token;
    req.session.accessToken = data.access_token;

    res.render('filter_first', { accessToken: accessToken});
  });
});


app.post('/filter_submit', async (req, res) => { // 根据填空题提交的项目名称，发送api请求，再回调至'table'路径
  const programText = req.body.program;
  const urlEncodedProgram = encodeURIComponent(programText);
  const enterprise = 'PunctureRobotics';
  const sort = 'updated'; // 排序依据: 创建时间(created)，或 更新时间(updated)
  // 例子: 如果 页数 = 2, 每页的issues = 3, 那么返回的时候，会跳过第一页的 {1st, 2nd, and 3rd issue}，而返回第二页的 {the 4th, 5th, and 6th issue}. 
  const issues_per_page = 100; // 最大100
  const direction = 'desc'; // 排序方式: 升序(asc)，降序(desc)
  const state = 'all'; // Issue的状态: open（开启的）, progressing(进行中), closed（关闭的）, rejected（拒绝的）
  const totalPages = 8; // Total number of pages to retrieve
  //const issuesEndpoint = `https://gitee.com/api/v5/enterprises/${enterprise}/issues?state=${state}&sort=${sort}&direction=${direction}&page=${page_number}&per_page=${issues_per_page}&program=${urlEncodedProgram}`;
  //const reposEndpoint = `https://gitee.com/api/v5/enterprises/${enterprise}/repos`

  try {
    global_issues_data = [];
    const fetchPage = async (page_number) => {
      const issuesEndpoint = `https://gitee.com/api/v5/enterprises/${enterprise}/issues?state=${state}&sort=${sort}&direction=${direction}&page=${page_number}&per_page=${issues_per_page}&program=${urlEncodedProgram}`;

      const response = await fetch(issuesEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `token ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to retrieve issues. Status: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Issues retrieved from page ${page_number}:`, data.length);

      global_issues_data = global_issues_data.concat(data);
    };

    for (let page_number = 1; page_number <= totalPages; page_number++) {
      await fetchPage(page_number);
    }

    console.log('Total number of issues retrieved:', global_issues_data.length);
    res.json(global_issues_data);
  } catch (error) {
    console.error('An error occurred:', error);
    res.status(500).send('Error during issue retrieval');
  }
});





// 后来 筛选仓库、人员、计划日期、里程碑等等
app.post('/filter_specific', (req, res) => {  
  const { repo, milestones, user, start_date, end_date} = req.body;
  

  // Perform filtering based on selected criteria
  const filteredData = global_issues_data.filter((issue) => {
    const userMatch = user.includes('all') || (user.length === 0) || user.includes(issue.assignee.remark);
    const repoMatch = repo === 'all' || issue.repository && issue.repository.path === repo;
    const milestonesMatch = milestones === 'all' || (issue.milestone && issue.milestone.title === milestones);
    

    // Checks if the issue's time interval falls within, intersects, or spans across the selected time interval
    let timeIntervalMatch = true; // default if user didn't select dates
    if (start_date && end_date) {
      const planStartedAt = new Date(issue.plan_started_at);
      const deadline = new Date(issue.deadline);
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const planStartedWithinInterval = planStartedAt >= startDate && planStartedAt <= endDate;
      const deadlineWithinInterval = deadline >= startDate && deadline <= endDate;
      const planStartedBeforeStart = planStartedAt <= startDate;
      const deadlineAfterEnd = deadline >= endDate;
      const planSpanEntireInterval = planStartedAt <= startDate && deadline >= endDate;
      const planSpanPartOfInterval = planStartedAt >= startDate && deadline <= endDate;
      timeIntervalMatch = planStartedWithinInterval || deadlineWithinInterval ||
        (planStartedBeforeStart && deadlineAfterEnd) || planSpanEntireInterval || planSpanPartOfInterval;
    }

    return userMatch && repoMatch && milestonesMatch && timeIntervalMatch;
  });
  
  res.json(filteredData);
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


const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
