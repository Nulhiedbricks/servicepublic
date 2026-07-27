import {expect} from 'chai';
import {getEcoIndexGrade} from "../dist/index.js";

/**
 * Test getEcoIndexGrade.
 */
describe('Compute ecoIndex', () => {
  // Correct values.
  it(`Should get ecoIndex grade`, () => {
    [
      {value: 81, grade: 'A'},
      {value: 80, grade: 'B'},
      {value: 71, grade: 'B'},
      {value: 70, grade: 'C'},
      {value: 56, grade: 'C'},
      {value: 55, grade: 'D'},
      {value: 41, grade: 'D'},
      {value: 40, grade: 'E'},
      {value: 26, grade: 'E'},
      {value: 25, grade: 'F'},
      {value: 11, grade: 'F'},
      {value: 10, grade: 'G'},
    ].forEach(fixture => {
      const grade = getEcoIndexGrade(fixture.value);
      expect(grade).to.be.a('string').to.be.eq(fixture.grade);
    })
  });

  // Invalid negative ecoIndex value.
  it(`Should return false for negative ecoIndex`, () => {
    const grade = getEcoIndexGrade(-1);
    expect(grade).to.be.a('boolean').to.be.eq(false);
  })

  // Invalid more than 100 ecoIndex value.
  it(`Should return false for ecoIndex greater than 100 `, () => {
    const grade = getEcoIndexGrade(110);
    expect(grade).to.be.a('boolean').to.be.eq(false);
  })
});
