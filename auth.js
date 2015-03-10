var http = require('http'),
    _ = require('underscore'),
    db = require('./db');

var permissions = {
  can_export_messages: ['national_admin', 'district_admin', 'analytics'],
  can_export_audit: ['national_admin'],
  can_export_feedback: ['national_admin'],
  can_export_contacts: ['national_admin', 'district_admin'],
  can_view_analytics: ['national_admin', 'district_admin', 'analytics'],
  can_view_data_records: ['national_admin', 'district_admin', 'analytics'],
  can_view_unallocated_data_records: ['national_admin', 'district_admin'],
  can_edit: ['national_admin', 'district_admin']
};

var get = function(url, headers, callback) {
  http.get({
    host: db.client.host,
    port: db.client.port,
    path: url,
    headers: headers
  }, function(res) {

    var content = [];

    res.on('data', function (chunk) {
      content.push(chunk);
    });

    res.on('end', function () {
      try {
        callback(null, JSON.parse(content.join('')));
      } catch(e) {
        callback('Could not parse response');
      }
    });

    res.on('error', function(e) {
      callback(e);
    });

  }).on('error', function(e) {
    callback(e.message);
  });
};

var hasRole = function(userCtx, role) {
  return _.contains(userCtx && userCtx.roles, role);
};

var isDbAdmin = function(userCtx) {
  return hasRole(userCtx, '_admin');
};

var hasPermission = function(userCtx, permission) {
  if (isDbAdmin(userCtx)) {
    return true;
  }
  if (!permission || !permissions[permission] || !userCtx || !userCtx.roles) {
    return false;
  }
  return _.some(permissions[permission], function(role) {
    return _.contains(userCtx.roles, role);
  });
};

var checkDistrict = function(requested, permitted, callback) {
  if (!requested) {
    // limit to configured facility
    return callback(null, permitted);
  }
  if (!permitted) {
    // national admin - give them what they want
    return callback(null, requested);
  }
  if (requested === permitted) {
    // asking for the allowed facility
    return callback(null, requested);
  }
  return callback({ code: 403, message: 'Insufficient privileges' });
};

var getUserCtx = function(req, callback) {
  get('/_session', req.headers, function(err, auth) {
    if (err) {
      return callback(err);
    }
    if (auth && auth.userCtx && auth.userCtx.name) {
      callback(null, auth.userCtx);
    } else {
      callback('Not logged in');
    }
  });
};

module.exports = {

  check: function(req, permission, districtId, callback) {
    getUserCtx(req, function(err, userCtx) {
      if (err) {
        return callback({ code: 401, message: err });
      }
      if (isDbAdmin(userCtx)) {
        return callback(null, { user: userCtx.name });
      }
      if (!hasPermission(userCtx, permission)) {
        return callback({ code: 403, message: 'Insufficient privileges' });
      }
      var url = '/_users/org.couchdb.user:' + userCtx.name;
      get(url, req.headers, function(err, user) {
        if (err) {
          return callback({ code: 500, message: err });
        }
        checkDistrict(districtId, user.facility_id, function(err, district) {
          if (err) {
            return callback(err);
          }
          callback(null, { user: userCtx.name, district: district });
        });
      });
    });
  },

  checkUrl: function(req, callback) {
    if (!req.params || !req.params.path) {
      return callback('No path given');
    }
    http.request({
      method: 'HEAD',
      host: db.client.host,
      port: db.client.port,
      path: req.params.path,
      headers: req.headers
    }, function(res) {
      callback(null, { status: res.statusCode } );
    }).on('error', function(e) {
      callback(e.message);
    }).end();
  }

};