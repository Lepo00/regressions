const tf = require('@tensorflow/tfjs');
const _ = require('lodash');

class MultinominalLogisticRegressionImage {
    constructor(features, labels, options) {
        this.features = this._processFeature(features);
        this.labels = tf.tensor(labels);
        this.costHistory = [];

        this.options = Object.assign(
            { learningRate: 0.1, iterations: 1000, batchSize: 10},
            options
        );

        this.weights = tf.zeros([this.features.shape[1], this.labels.shape[1]]);
    }

    _processFeature(features) {
        features = tf.tensor(features);

        if (this.mean && this.variance) {
            features = features.sub(this.mean).div(this.variance.pow(.5));
        } else {
            features = this.standardize(features);
        }

        features = tf.ones([features.shape[0], 1]).concat(features, 1);
        return features;
    }

    train() {
        const batchQty = Math.floor(
            this.features.shape[0] / this.options.batchSize
        );

        for (let i = 0; i < this.options.iterations; i++) {
            for (let j = 0; j < batchQty; j++) {
                this.weights = tf.tidy(() => {
                    const featureSlice = this.features.slice([j * this.options.batchSize, 0], [this.options.batchSize, -1]);
                    const labelSlice = this.labels.slice([j * this.options.batchSize, 0], [this.options.batchSize, -1]);
                    return this.gradientDescent(featureSlice, labelSlice);
                })
            }
            this.recordCost();
            this.updateLearningRate();
        }
    }

    test(testFeatures, testLabels) {
        const predictions = this.predict(testFeatures);

        const incorrect = tf.tidy(() => {
            testLabels = tf.tensor(testLabels).argMax(1);

            return predictions
                .notEqual(testLabels)
                .sum()
                .get();
        })

        const accuracy = (predictions.shape[0] - incorrect) / predictions.shape[0];
        return accuracy * 100;
    }

    gradientDescent(features, labels) {
        const currentGuesses = features.matMul(this.weights).softmax();
        const differences = currentGuesses.sub(labels);

        const slopes = features
            .transpose()
            .matMul(differences)
            .div(features.shape[0]);

        return this.weights.sub(slopes.mul(this.options.learningRate))
    }

    standardize(features) {
        const { mean, variance } = tf.moments(features, 0)
        const filler = variance.cast('bool').logicalNot().cast('float32');

        this.mean = mean;
        this.variance = variance.add(filler);

        return features.sub(mean).div(this.variance.pow(.5));
    }

    recordCost() {
        const cost = tf.tidy(() => {
            const guesses = this.features.matMul(this.weights).softmax();

            const t1 = this.labels.transpose().matMul(guesses.add(1e-7).log());
            const t2 = this.labels
                .mul(-1)
                .add(1)
                .transpose()
                .matMul(
                    guesses
                        .mul(-1)
                        .add(1)
                        .add(1e-7) // add a constant to avoid log(0)
                        .log()
                )

            return t1.add(t2).div(this.features.shape[0]).mul(-1).get(0, 0);
        });
        this.costHistory.unshift(cost);
    }

    updateLearningRate() {
        if (this.costHistory.length > 2) return;

        const lastValue = this.costHistory[this.costHistory.length - 1];
        const secondLast = this.costHistory[this.costHistory.length - 2];

        if (lastValue > secondLast)
            this.options.learningRate /= 2;
        else
            this.options.learningRate *= 1.05;
    }

    predict(observations) {
        return this._processFeature(observations)
            .matMul(this.weights)
            .softmax()
            .argMax(1);
    }
}

module.exports = MultinominalLogisticRegressionImage;