'use strict';

var config = require('./config.json');

var request = require('request');

var JiraRestHelper = function (jql) {
    return request({
        url: config.endpoint,
        method: "POST",
        json: true,
        body: {
            "jql": jql,
            "maxResults": config.maxResults
        },
        headers: {
            "Authorization": "Basic " + (new Buffer(config.username + ":" + config.password)).toString("base64"),
            "Accept": "application/json"
        }
    });
};
module.exports = JiraRestHelper;
