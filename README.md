# Gitee数字化-研发效能度量-网页应用 Gitee-Issue-Overview Web App

[![构建状态](https://travis-ci.com/AmyHY/Gitee_Issue_Overview.svg?branch=main)](https://travis-ci.com/AmyHY/Gitee_Issue_Overview)

## 目录

- [简介](#简介)
- [安装](#安装)
- [使用](#使用)
- [功能特性](#功能特性)
- [贡献](#贡献)
- [许可证](#许可证)
- [开发者维护](#开发者维护)

## 简介

- 概括：这是一个用来提高Gitee使用效率的网页应用，以列表形式为企业管理者提供从Gitee实时获取的“员工工作项“概览。
提供四个表格，可用来概览各个员工的工作进度、工作态度、工作强度、个人进度。注：表格内所有的工作项 为该登陆账号在Gitee内有权限看到的工作项。

- 目标受众：使用Gitee的、需用批量跟进员工Gitee进度的企业管理者。

- 工具：Node.js, express

- ps：开发者请参考《开发者维护》部分了解代码结构、以及后续工作

## 安装

- 克隆仓库
    - 首先，将 Gitee 仓库克隆到本地计算机.打开终端并导航到要克隆仓库的目录：
    ```bash
    cd /你希望放置仓库的目录
    git clone <仓库网址>
    ```
- 安装 Node.js
    - 确保你安装了 Node.js 和 npm（Node 包管理器）
    - 你可以从官方 Node.js 网站下载它们：https://nodejs.org/
    - 配置node环境：http://www.rply.cn/news/136092.html
- 进入克隆的仓库目录
    ```bash
    cd /克隆仓库的路径
    ```
- 安装依赖
    - 大多数 Node.js 项目都有一个包含项目依赖项的 package.json 文件。你需要安装这些依赖项
    ```bash
    npm install
    ```
- 确保全局安装了 nodemon
    ```bash
    npm install -g nodemon
    ```



## 使用

- 说明：目前未部署外部服务器（正在尝试用阿里云ECS云服务器）。
- 在克隆的仓库目录内，在localhost：3000上启动应用
```bash
nodemon app.js
```
- 如果报错“npm不是内部或外部命令”，则跑:
```bash
npx nodemon app.js
```
- 如果成功跑了port 3000本地服务器，应该看到终端里显示
 ```
 [nodemon] starting `node app.js`
 Server is running on port 3000
 ```
- 如果报错
```bash
node:events:491
      throw er; // Unhandled 'error' event
      ^
Error: listen EADDRINUSE: address already in use :::3000
```
- 则Ctrl+C, 找到正在占用port 3000的process的PID，并且终止该process:
```bash
lsof -i :3000
kill <PID>
nodemon app.js // 或者 npx nodemon app.js
```


- 在浏览器中访问应用
    - 首页（http://localhost:3000） 
    - 点击按钮，跳转授权页，通过Gitee账号授权 （需要提前登陆Gitee账号）
    - 自动跳转页面，提交筛选条件（如项目）
    - 自动跳转页面，点击筛选项旁的‘提交’，显示表格
    - 点击“标题链接”按钮时
        - 为了防止跳转页面、授权码失效，请点击右键“在新窗口中打开链接”，而不是直接左键点击“标题链接”按钮

## 功能特性


- 功能 1: 可筛选项目、仓库、人员、里程碑、计划时间。
- 功能 2: 预设的四个表格可以分类计算所需信息，且其中表格1、3附有饼图、表格2有任务链接
- 功能 3: 实时获取Gitee上该账号有权限看到的所有工作项，工作项包括任务、缺陷、需求。
- 功能 4: 可创建新工作项，新工作项将实时在Gitee上生成


## 贡献

- 功能需求 & 反馈：王博
- 代码实现：何樾

## 许可证

This project is licensed under Puncture Robotic.

## 开发者维护

- 4个主要页面解析
    - index.html 首页 按钮触发OAuth授权
        - ![index](/public/images/GiteeApp_index.png)
        - 使用：
            - 按钮超链接 跳转授权页：
            - https://gitee.com/oauth/authorize?client_id={client_id}&redirect_uri={redirect_url}&response_type=code
        - 解释：
            - 原理参考 [OAuth文档](https://gitee.com/api/v5/oauth_doc#/)
            - url里的‘response_type=code’表示授权后会在回调地址后面提供授权码。如果url里没有‘response_type=code’，授权页会显示无效。
            - url参数 'client_id' 来自于本人（初始开发者）的自建应用，在本人的Gitee账号-->设置-->第三方应用 里查看
            - client id = 5040df88da763a1b560454f3dfd04595fe23be3d015a37020c640dc02ded3a33
            - 如果在本地服务器上跑，url参数 'redirect_url' 应该是 http://localhost:3000/filter_first 。该参数也需要配对Gitee网站设置里自建应用的‘应用回调地址’，详情请看下文的“后续工作/在内更换域名”部分。

    - Gitee授权页
        - ![authorization](/public/images/GiteeApp_authorization.png)
        - 使用：
            - 点击授权，等待几秒
        - 解释：
            - 需提前在别的浏览器页面登陆Gitee账号
            - 此授权页是Gitee的，不是本人写的
            - 点击授权后，Gitee会将authorizaiton code放在回调地址url后面，可以在浏览器的url栏里面看到
            - 如果授权页显示“存在的回调地址无效”，需要检查
                - （1）'index.html' 里超链接的参数 'redirect_url' 是否匹配Gitee网站设置里自建应用的‘应用回调地址’以及'app.js' 里的 'redirectUri'参数
                - （2）'index.html' 里超链接的最后是否有‘response_type=code’

    - views/filter_first.ejs 第一筛选页
        - ![filter_first](/public/images/GiteeApp_filter_first.png)
        - 使用：
            - 输入项目名称文字，点击提交，等待10秒左右
        - 解释：
            - 筛选总页面，目的是不要一次性获取所有的工作项导致卡顿
            - 在'app.js' 里的'/filter_first' GET请求处理器里，通过回调地址后面的code={}, 提取authorization code，结合client ID & client secret进行token置换，得到access token，并将access token存为global变量。
            - 用户提交筛选后，'filter_first.ejs' 通过form post，将项目名称发送到'app.js' 里的 '/filter_submit' POST请求处理器。在那里，设置各个参数限制后，向Gitee发送API请求，获取该项目里的工作项array，并将工作项array存入global变量'global_issues_data'.
            - 在'app.js' 里的'/filter_submit'获取成功后，在'filter_first.ejs'里，跳转 '/table'页面

    - views/table.ejs 表格页
        - ![table](/public/images/GiteeApp_table.jpeg)
        - 使用：
            - 可以直接点击‘提交’显示所有信息，也可以筛选后点击‘提交’。除非点击‘提交’，否则表格内容不会出现。
            - 将鼠标hover在饼图上会出现百分比
            - 点击网页上方按钮，创建新工作项（Gitee上会同步实时生成）
        - 解释：
            - 用户提交筛选后，'table.ejs' 通过form post，将项目名称发送到'app.js' 里的 '/filter_specific' POST请求处理器。在那里，将筛选参数与'global_issues_data'里的工作项参数一一对比，将筛选后的工作项array发回'table.ejs'。
            - 在'table.ejs'里，将筛选后的工作项array转换成userArray。userArray里的每个element对应每个user，有name和issues（array）两个参数。
            - 四个表格分别计算信息，以为工作进度、工作态度、工作强度、个人进度提供参考。
            - 表格1、3使用chart.js生成饼图。
            - 创建新工作项按钮：在'app.js'里的'/create-issue' POST请求处理器里，发送API请求至Gitee。如果创建成功，则回到首页。（如果回到filter_first页或table页，会丢失access token）

    
        

- 后续工作
    - 在内更换域名
        - 需要改三个地方。例如，把localhost该到example.com
            - (1) 改 'index.html' 按钮超链接的'redirect_url'
                - 原来的代码（记得置换client_id）
                ```javascript
                        <a href="https://gitee.com/oauth/authorize?client_id={client_id}&redirect_uri=http://localhost:3000/filter_first&response_type=code">授权</a>
                ```
                - 修改后的代码（记得置换client_id）
                ```javascript
                        <a href="https://gitee.com/oauth/authorize?client_id={client_id}&redirect_uri=https://example.com/filter_first&response_type=code">授权</a>
                ```
            - (2) 改 'app.js'里的'redirectUri'参数
                - 原来的代码
                ```javascript
                        const redirectUri = 'http://localhost:3000/filter_first';
                ```
                - 修改后的代码
                ```javascript
                        const redirectUri = 'https://example.com/filter_first';
                ```
            - (3) 改 Gitee网站点击右上角头像-->账号设置-->第三方应用的‘应用回调地址’
                - 原来的设置
                - ![localhost](/public/images/GiteeApp_localhost.png)
                - 修改后的设置
                - ![domain](/public/images/GiteeApp_domain.png)
                
    - 在外部署服务器
        - 待操作：阿里云云服务器
            - 已在NameCheap网站的FreeDNS设置了higof.com的域名DNS，并使用github的服务器（但是github服务器不支持含有API请求的动态网站）
        - 待操作：部署环境（针对nodejs）
        - 待操作：宝塔面板上传文件
    - 构建“备注”栏
        - 待操作：用数据库
