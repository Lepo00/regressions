const tf = require('@tensorflow/tfjs');
const _ = require('lodash');

class LinearRegression {
    constructor(features, labels, options) {
        this.features = this._processFeature(features);
        this.labels = tf.tensor(labels);
        this.mseHistory = [];

        this.options = Object.assign(
            { learningRate: 0.1, iterations: 1000 },
            options
        );

        this.weights = tf.zeros([this.features.shape[1], 1]);
    }

    _processFeature(features) {
        features = tf.tensor(features);

        if (this.mean && this.variance) {
            features = features.sub(mean).div(variance.pow(.5));
        } else {
            features = this.standardize(features);
        }

        features = tf.ones(features.shape[0], 1).concat(features, 1);
        return features;
    }

    train() {
        for (let i = 0; i < this.options.iterations; i++) {
            this.gradientDescent();
            this.recordMSE();
            this.updateLearningRate();
        }
    }

    test(testFeatures, testLabels) {
        testFeatures = this._processFeature(testFeatures);
        testLabels = tf.tensor(testLabels);

        const predictions = testFeatures.matMul(this.weights);

        const ssRes = testLabels.sub(predictions).pow(2).sum().get();
        const ssTot = testLabels.sub(testLabels.mean()).pow(2).sum().get();

        return 1 - ssRes / ssTot;
    }

    gradientDescent() {
        /*const currentGuesses = this.features.map(row => {
            return this.m * row[0] + this.b;
        })

        const bSlope = _.sum(currentGuesses.map((guess, i) => {
            return guess - this.labels[i][0]
        })) * 2 / this.features.length;

        const mSlope = _.sum(currentGuesses.map((guess, i) => {
            return -1 * this.features[i][0] * (this.labels[i][0] - guess)
        })) * 2 / this.features.length;

        this.m = this.m - mSlope * this.options.learningRate;
        this.b = this.b - bSlope * this.options.learningRate;*/

        const currentGuesses = this.features.matMul(this.weights);
        const differences = currentGuesses.sub(this.labels);

        const slopes = this.feature
            .transpose()
            .matMul(differences)
            .div(this.features.shape[0]);

        this.weights = this.weights.sub(slopes.mul(this.options.learningRate))
    }

    standardize(features) {
        const { mean, variance } = tf.moments(features, 0);

        this.mean = mean;
        this.variance = variance;

        return features.sub(mean).div(variance.pow(.5));
    }

    recordMSE() {
        const mse = this.features
            .matMul(this.weights)
            .sub(this.labels)
            .pow(2)
            .sum()
            .div(this.features.shape[0])
            .get();

        this.mseHistory.push(mse);
    }

    updateLearningRate() {
        if (this.mseHistory.length > 2) return;

        const lastValue = this.mseHistory[this.mseHistory.length - 1];
        const secondLast = this.mseHistory[this.mseHistory.length - 2];

        if (lastValue > secondLast)
            this.options.learningRate /= 2;
        else
            this.options.learningRate *= 1.05;
    }
}

module.exports = LinearRegression;