import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
import scipy.stats as stats
import statsmodels.stats.multicomp as multi
from matplotlib.container import BarContainer
from pandas import Series
import enum


class Metric(str, enum.Enum):
    Throughput = "throughput"
    Latency = "latency"


class ErrorType(str, enum.Enum):
    STD = "std"
    SEM = "sem"
    CI = "ci"

# The .csv structure looks like this ["time"], ["producer-service-1_throughput"]....., ["total_throughput"], ["producer-service-1_latency"]....., ["average_latency"]

# The scale of the diagram is based on the maximum value of any dataset.
# This list is used to calculate the maximum y-value and maximum x-value of any dataset
# If a different scale is needed, comment the line for the unwanted datasets
csv_files_data: list[dict] = [
    dict(broker="RabbitMQ", data=pd.read_csv("./data/study/RabbitMQ-1-8-20-Experiment_7.csv"), num_producers=1, color="#fdd1bb", font_color="#000000"),
    dict(broker="RabbitMQ", data=pd.read_csv("./data/study/RabbitMQ-2-8-20-Experiment_8.csv"), num_producers=2, color="#fba478", font_color="#000000"),
    dict(broker="RabbitMQ", data=pd.read_csv("./data/study/RabbitMQ-4-8-20-Experiment_9.csv"), num_producers=4, color="#f97634", font_color="#000000"),
    dict(broker="RabbitMQ", data=pd.read_csv("./data/study/RabbitMQ-8-8-20-Experiment_10.csv"), num_producers=8, color="#e05007", font_color="#ffffff"),
    dict(broker="RabbitMQ", data=pd.read_csv("./data/study/RabbitMQ-12-8-20-Experiment_11.csv"), num_producers=12, color="#a83c05", font_color="#ffffff"),
    dict(broker="RabbitMQ", data=pd.read_csv("./data/study/RabbitMQ-16-8-20-Experiment_12.csv"), num_producers=16, color="#702804", font_color="#ffffff"),
    dict(broker="Kafka", data=pd.read_csv("./data/study/Kafka-1-8-20-Experiment_1.csv"), num_producers=1, color="#b7ebfa", font_color="#000000"),
    dict(broker="Kafka", data=pd.read_csv("./data/study/Kafka-2-8-20-Experiment_2.csv"), num_producers=2, color="#6ed7f5", font_color="#000000"),
    dict(broker="Kafka", data=pd.read_csv("./data/study/Kafka-4-8-20-Experiment_3.csv"), num_producers=4, color="#26c3f0", font_color="#000000"),
    dict(broker="Kafka", data=pd.read_csv("./data/study/Kafka-8-8-20-Experiment_4.csv"), num_producers=8, color="#0D95BC", font_color="#ffffff"),
    dict(broker="Kafka", data=pd.read_csv("./data/study/Kafka-12-8-20-Experiment_5.csv"), num_producers=12, color="#0a708d", font_color="#ffffff"),
    dict(broker="Kafka", data=pd.read_csv("./data/study/Kafka-16-8-20-Experiment_6.csv"), num_producers=16, color="#074a5e", font_color="#ffffff"),
]

# This list should include all datasets to actually show while the previous list is only used to keep a scale
csv_files_data_to_show: list[dict] = [
    dict(broker="RabbitMQ", data=pd.read_csv("./data/study/RabbitMQ-1-8-20-Experiment_7.csv"), num_producers=1, color="#fdd1bb", font_color="#000000"),
    dict(broker="RabbitMQ", data=pd.read_csv("./data/study/RabbitMQ-2-8-20-Experiment_8.csv"), num_producers=2, color="#fba478", font_color="#000000"),
    dict(broker="RabbitMQ", data=pd.read_csv("./data/study/RabbitMQ-4-8-20-Experiment_9.csv"), num_producers=4, color="#f97634", font_color="#000000"),
    dict(broker="RabbitMQ", data=pd.read_csv("./data/study/RabbitMQ-8-8-20-Experiment_10.csv"), num_producers=8, color="#e05007", font_color="#ffffff"),
    dict(broker="RabbitMQ", data=pd.read_csv("./data/study/RabbitMQ-12-8-20-Experiment_11.csv"), num_producers=12, color="#a83c05", font_color="#ffffff"),
    dict(broker="RabbitMQ", data=pd.read_csv("./data/study/RabbitMQ-16-8-20-Experiment_12.csv"), num_producers=16, color="#702804", font_color="#ffffff"),
    dict(broker="Kafka", data=pd.read_csv("./data/study/Kafka-1-8-20-Experiment_1.csv"), num_producers=1, color="#b7ebfa", font_color="#000000"),
    dict(broker="Kafka", data=pd.read_csv("./data/study/Kafka-2-8-20-Experiment_2.csv"), num_producers=2, color="#6ed7f5", font_color="#000000"),
    dict(broker="Kafka", data=pd.read_csv("./data/study/Kafka-4-8-20-Experiment_3.csv"), num_producers=4, color="#26c3f0", font_color="#000000"),
    dict(broker="Kafka", data=pd.read_csv("./data/study/Kafka-8-8-20-Experiment_4.csv"), num_producers=8, color="#0D95BC", font_color="#ffffff"),
    dict(broker="Kafka", data=pd.read_csv("./data/study/Kafka-12-8-20-Experiment_5.csv"), num_producers=12, color="#0a708d", font_color="#ffffff"),
    dict(broker="Kafka", data=pd.read_csv("./data/study/Kafka-16-8-20-Experiment_6.csv"), num_producers=16, color="#074a5e", font_color="#ffffff"),
]

img_output_folder: str = "./data/study/img/"
metric: Metric = Metric.Throughput  # The metric to graph from the files
remove_tail: int = 20  # The number of values to remove from the beginning of data (producers produce before consumer is ready causing low throughput and high latency in beginning of experiment)
remove_head: int = 20  # The number of values to remove from head of data
fig_width_cm: float = 40.0
fig_height_cm: float = 20.0
dpi = 150
confidence_level: float = 0.95

column: str = "total_throughput" if metric == Metric.Throughput else "average_latency"
keyword: str = column.replace('_' + metric.value, '').capitalize()

colors: list = []
font_colors: list = []
labels: list = []
data_series: list[Series] = []
data_series_to_show: list[Series] = []

for csv_file_data in csv_files_data:
    if remove_head == 0 and remove_tail == 0:
        data_series.append(csv_file_data["data"][column])
    elif remove_head == 0 and remove_tail != 0:
        data_series.append(pd.Series(csv_file_data["data"][column].tolist()[remove_tail:]))
    elif remove_head != 0 and remove_tail == 0:
        data_series.append(pd.Series(csv_file_data["data"][column].tolist()[:-remove_head]))
    else:
        data_series.append(pd.Series(csv_file_data["data"][column].tolist()[remove_tail:-remove_head]))


max_length = max([*map(lambda col: len(col), data_series)])
max_value = max([*map(lambda col: col.max(), data_series)])
part_size = max_value / (185 / 5)

for csv_file_data_to_show in csv_files_data_to_show:
    colors.append(csv_file_data_to_show["color"])
    font_colors.append(csv_file_data_to_show["font_color"])
    labels.append(csv_file_data_to_show["broker"] + " " + str(csv_file_data_to_show["num_producers"]))
    if remove_head == 0 and remove_tail == 0:
        data_series_to_show.append(csv_file_data_to_show["data"][column])
    elif remove_head == 0 and remove_tail != 0:
        data_series_to_show.append(pd.Series(csv_file_data_to_show["data"][column].tolist()[remove_tail:]))
    elif remove_head != 0 and remove_tail == 0:
        data_series_to_show.append(pd.Series(csv_file_data_to_show["data"][column].tolist()[:-remove_head]))
    else:
        data_series_to_show.append(pd.Series(csv_file_data_to_show["data"][column].tolist()[remove_tail:-remove_head]))


def cm_to_inch(value):
    return value / 2.54


def generate_line_chart(in_data_series: list[Series]) -> None:
    plt.figure(figsize=(cm_to_inch(fig_width_cm), cm_to_inch(fig_height_cm)))
    for index, _ in enumerate(in_data_series):
        y = in_data_series[index]
        x = range(1, len(y) + 1)  # First data point at 1 instead of 0
        plt.plot(x, y, label=labels[index], linewidth="2", color=colors[index])

    plt.xlabel("Message aggregation (#)")
    plt.ylabel(f"Throughput (msgs/sec)" if metric == Metric.Throughput else "Latency (ms)")
    plt.title(f"{keyword} {metric.value} data")
    plt.legend(loc="upper right")
    plt.grid(True)
    plt.ylim(ymin=0, ymax=max_value + part_size)
    if remove_head == 0 or remove_tail == 0:
        plt.xlim(xmin=0, xmax=max_length)
    else:
        plt.xlim(xmin=0, xmax=max_length - (remove_head + remove_tail))
    plt.savefig(f"{img_output_folder}line-{metric}.png", bbox_inches="tight", dpi=dpi)
    plt.show()


def mean_confidence_interval(data, confidence=0.95) -> tuple:
    a = 1.0 * np.array(data)
    n = len(a)
    m, se = np.mean(a), stats.sem(a)
    h = se * stats.t.ppf((1 + confidence) / 2., n - 1)
    return -h, +h


def generate_bar_chart(in_data_series: list[Series], error_type: ErrorType = ErrorType.STD) -> None:
    bar_width: float = 0.9
    font_size: int = 10

    means: list[float] = []
    stds: list[float] = []
    sems: list[float] = []
    cis: list[float] = []

    for series in in_data_series:
        means.append(series.mean())
        stds.append(series.std())
        sems.append(series.sem())
        cis.append(mean_confidence_interval(series, confidence_level)[1])

    yerr: list[float] = stds if error_type.value == "std" else (sems if error_type.value == "sem" else cis)
    bars_order: range = range(len(labels))
    interval_capsize: int = 8

    plt.figure(figsize=(cm_to_inch(fig_width_cm), cm_to_inch(fig_height_cm)))
    bar_plot: BarContainer = plt.bar(bars_order, means, yerr=yerr, edgecolor="black", linewidth=1, width=bar_width, capsize=interval_capsize, color=colors)

    for index, rect in enumerate(bar_plot):
        x_middle = rect.get_x() + rect.get_width() / 2.0
        y_middle = rect.get_y() + rect.get_height() / 2.0

        if part_size * 2 > y_middle:
            plt.text(x_middle, rect.get_height() + part_size * 3, round(means[index], 2), ha="center", va="center", fontsize=font_size, color="#000000")
            plt.text(x_middle, rect.get_height() + part_size, round(yerr[index], 2), ha="center", va="center", fontsize=font_size, color="#000000")
        else:
            plt.text(x_middle, part_size * 3, round(means[index], 2), ha="center", va="center", fontsize=font_size, color=font_colors[index])
            plt.text(x_middle, part_size, round(yerr[index], 2), ha="center", va="center", fontsize=font_size, color=font_colors[index])

    plt.xticks(range(len(labels)), labels, fontsize=font_size)

    plt.ylabel("Throughput (msgs/sec)" if metric == Metric.Throughput else "Latency (ms)")
    plt.xlabel("Broker/number of producers")
    plt.title(f"{keyword} {metric.value} data | Means/{error_type.value.upper()}s Comparison")
    plt.ylim(ymin=0, ymax=max_value + part_size)
    plt.savefig(f"{img_output_folder}bar-{metric}-{error_type.value.lower()}.png", bbox_inches="tight", dpi=dpi)
    plt.show()


def anova(in_data_series: list[Series]) -> None:
    if len(in_data_series) < 2:
        return print("ANOVA test requires at least 2 groups...")

    fvalue, pvalue = stats.f_oneway(*in_data_series)

    print(f"Results of ANOVA test:\nThe F-statistic is: {str(fvalue)}\n The p-value is: {str(pvalue)}")

    if pvalue < (1 - confidence_level):
        print("The means are different")
    else:
        print("No difference in means")


def tukey_test(in_data_series: list[Series]) -> None:
    df: DataFrame = pd.DataFrame()

    if len(in_data_series) < 3:
        return print("Tukey test requires at least 3 groups...")

    for index, _ in enumerate(in_data_series):
        df[labels[index]] = in_data_series[index]

    stacked_data = df.stack().reset_index()
    stacked_data = stacked_data.rename(columns={"level_1": "groups", 0: "result"})

    tukey_results: multi.TukeyHSDResults = multi.pairwise_tukeyhsd(endog=stacked_data["result"], groups=stacked_data["groups"], alpha=(1.0-confidence_level))
    print(tukey_results.summary())

    grand_mean = stacked_data["result"].values.mean()
    figsize = (cm_to_inch(fig_width_cm), cm_to_inch(fig_height_cm))
    xlabel = "Throughput (msgs/sec)" if metric == Metric.Throughput else "Latency (ms)"
    ylabel = "Broker/producers"

    for label in labels:
        tukey_results.plot_simultaneous(comparison_name=label, figsize=figsize, xlabel=xlabel, ylabel=ylabel)
        plt.vlines(x=grand_mean, ymin=-0.5, ymax=len(data_series) - 0.5, color="black", linestyles="dashed")
        plt.savefig(f"{img_output_folder}tukey/tukey-{metric}-{label}.png", bbox_inches="tight", dpi=dpi)
        plt.show()

generate_line_chart(data_series_to_show)
generate_bar_chart(data_series_to_show, ErrorType.STD)
generate_bar_chart(data_series_to_show, ErrorType.SEM)
generate_bar_chart(data_series_to_show, ErrorType.CI)
anova(data_series)
tukey_test(data_series)
