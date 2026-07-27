# EcoIndex - JS

This project provides methods for the EcoIndex calculation.

It is based on the work of the association [GreenIT](https://www.greenit.fr/)
and the web extension [GreenIT-Analysis](https://github.com/cnumr/GreenIT-Analysis/).

The sources are based on the initial Web Extension ([https://github.com/cnumr/GreenIT-Analysis/blob/master/script/ecoIndex.js](https://github.com/cnumr/GreenIT-Analysis/blob/master/script/ecoIndex.js)) code.
The calculation method is described on here : ([EcoIndex pouplation](https://www.ecoindex.fr/comment-ca-marche/))

# Install
Install package with npm  
`npm install ecoindex`

# How to use ?

## computeEcoIndex(dom, req, size)
`computeEcoIndex` returns the ecoIndex according to 3 parameters.

### Parameters
| Name | Type | Description  |
| --- | --- |--------------|
| dom | number | Number of DOM elements | 
| req | number | Number of requests | 
| size | number | Size of response (Ko) | 

### Example
```javascript
import {computeEcoIndex} from "ecoindex";

const ecoIndex = computeEcoIndex(dom, req, size);
```


## getEcoIndexGrade(ecoIndex)
`getEcoIndexGrade` returns the grade according to the ecoIndex value.

### Parameters
| Name    | Type | Description        |
|---------| --- |--------------------|
| ecoIndex | number | The EcoIndex value | 

### Example
```javascript
import {computeEcoIndex, getEcoIndexGrade} from "ecoindex";

const ecoIndex = computeEcoIndex(dom, req, size);
const grade = getEcoIndexGrade(ecoIndex);
```

## Testing
We use mocha for testing.
You can launch tests using this command : 
```
npm test
```

## [License](LICENSE)

## Disclaimer
The LCA values used by ecoindex to evaluate environmental impacts are not under free license - ©Frédéric Bordage  
Please also refer to the mentions provided in the code files for specifics on the IP regime.
