<?php

// The purpose of this file is to serve up the index.html, but add in several parameters
// that are known in advance, because we are being called in the WordPress context.

$username = urldecode($_REQUEST['username']);
$cert     = urldecode($_REQUEST['cert']);
$server   = urldecode($_REQUEST['server']);

if(! $server || $server == "") {
    $server = "https://psygraph.com/wp-content/plugins/psygraph/pg";
}

$script = "var WORDPRESS   = true;\n" .
          "var WP_USERNAME = '$username';\n" .
          "var WP_CERT     = '$cert';\n" .
          "var WP_SERVER   = '$server';\n";


$url  = 'index.html';
$data = file_get_contents("php://input", TRUE);

// use key 'http' even if you send the request to https://...
$options = array(
    'http' => array(
        'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
        'method'  => 'POST'
        //'content' => http_build_query($data),
        )
    );

$context = stream_context_create($options);
$result  = file_get_contents($url, false, $context);
$result  = str_replace("var WORDPRESS=false;", $script, $result);
print($result);

exit(0);

?>
