'use strict';

const base45 = require('base45');
const zlib = require('zlib');
const cbor = require('cbor');
const util = require('util');
const fs = require('fs/promises');

const unzip = util.promisify(zlib.unzip);

const filename = process.argv[2];

if (!filename) {
	console.error('Certificate filename is required as an argument.');
	process.exit(1);
} else {
	processCertFile(filename);
}

async function processCertFile(fname) {
	console.log();

	const certText = (await fs.readFile(fname)).toString();

	console.log(certText);
	console.log();
	
	if (certText.substr(0,4) !== 'HC1:') {
		throw new Error('Invalid certificate file');
	}
	
	const certZip = base45.decode(certText.substr(4));

	console.log('ZIP:', certZip);
	console.log();
	
	const certCose = await unzip(certZip);
	
	console.log('COSE:', certCose);
	console.log();
	
	const certTags = await cbor.decodeAll(certCose);
	
	console.log('TAGS:', certTags);
	console.log();
	
	if (certTags.length !== 1 || certTags[0].tag !== 18 ||
	   !certTags[0].value || certTags[0].value.length !== 4) {
		throw new Error('Unsupported certificate format');
	}
	
	const certClaimsBin = certTags[0].value[2];
	
	console.log('CLAIMS (bin):', certClaimsBin);
	console.log();
	
	const certClaims = await cbor.decodeFirst(certClaimsBin);

	console.log('CLAIMS:', certClaims);
	console.log();
	
	printCertClaims(certClaims);
}

function printCertClaims(cert) {
	console.log('================');
	console.log();
	
	console.log('Issuer: ', cert.get(1));
	console.log('Issued: ', getDate(cert.get(6) * 1000));
	console.log('Expires:', getDate(cert.get(4) * 1000));
	console.log();
	
	const hcert = cert.get(-260).get(1);
	
	console.log('Version:', hcert.ver);
	console.log('Name:   ', hcert.nam.gn, hcert.nam.fn);
	console.log('Birth:  ', hcert.dob);
	console.log();

	if (hcert.v) {
		console.log('-- Vaccination info --');
		console.log();
		hcert.v.forEach(vi => {
			console.log('Certificate: ', vi.ci);
			console.log('Country:     ', vi.co);
			console.log('Issuer:      ', vi.is);
			console.log('Date:        ', vi.dt);
			console.log('Dose:        ', `${vi.dn}/${vi.sd}`);
			console.log('Manufacturer:', vi.ma);
			console.log('Product:     ', vi.mp);
			console.log('SONMED CT:   ', vi.tg);
			console.log('Vaccine Type:', vi.vp);
			console.log();
		});
	}

	if (hcert.t) {
		console.log('-- Tests info --');
		console.log();
		console.log('(not supported yet)');
		console.log();
	}

	if (hcert.r) {
		console.log('-- Recovery info --');
		console.log();
		console.log('(not supported yet)');
		console.log();
	}
}

function getDate(timestamp) {
	return (new Date(timestamp)).toISOString().split('T')[0];
}
