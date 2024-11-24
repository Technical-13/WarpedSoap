const express = require( 'express' );

const router = express.Router();

router.use( '/discord', require( './discord' ) );
//router.use( '/wiki', require( './wiki' ) );

module.exports = router;